package main

import (
    "crypto/rand"
    "encoding/base64"
    "encoding/hex"
    "encoding/json"
    "log"
    "net/http"
    "sync"
    "time"
)

type Blob struct {
    IV      []byte `json:"iv"`
    Data    []byte `json:"data"`
    Tag     []byte `json:"tag"`
    TTLms   int    `json:"ttl_ms"`
    Created time.Time `json:"-"`
    PassHash []byte `json:"pass_hash,omitempty"`
    SenderID string `json:"sender_id,omitempty"`
    Salt    []byte `json:"salt,omitempty"`
}

type Store struct {
    m map[string]*Blob
    mu sync.Mutex
}

type Token struct {
    ID string `json:"id"`
    Exp time.Time `json:"-"`
}

type Device struct {
    ID string `json:"id"`
    PubKey []byte `json:"pubkey"`
    Created time.Time `json:"created"`
}

type Registry struct {
    tokens map[string]Token
    devices map[string]Device
    mu sync.Mutex
}

type Inbox struct {
    q map[string][]string
    mu sync.Mutex
}

type IDRegistry struct {
    m map[string]string
    mu sync.Mutex
}

type Ack struct {
    BlobID string `json:"blob_id"`
    Status string `json:"status"`
    Time time.Time `json:"time"`
}

type AckQueue struct {
    q map[string][]Ack
    mu sync.Mutex
}

func (aq *AckQueue) push(dev string, a Ack) {
    aq.mu.Lock()
    aq.q[dev] = append(aq.q[dev], a)
    aq.mu.Unlock()
}

func (aq *AckQueue) pop(dev string) (Ack, bool) {
    aq.mu.Lock()
    defer aq.mu.Unlock()
    arr := aq.q[dev]
    if len(arr) == 0 {
        return Ack{}, false
    }
    a := arr[0]
    aq.q[dev] = arr[1:]
    return a, true
}

func (i *Inbox) push(dev string, id string) {
    i.mu.Lock()
    i.q[dev] = append(i.q[dev], id)
    i.mu.Unlock()
}

func (i *Inbox) pop(dev string) (string, bool) {
    i.mu.Lock()
    defer i.mu.Unlock()
    arr := i.q[dev]
    if len(arr) == 0 {
        return "", false
    }
    id := arr[0]
    i.q[dev] = arr[1:]
    return id, true
}

func (i *Inbox) purgeMissing(s *Store) {
    i.mu.Lock()
    for dev, arr := range i.q {
        var keep []string
        for _, id := range arr {
            s.mu.Lock()
            _, ok := s.m[id]
            s.mu.Unlock()
            if ok {
                keep = append(keep, id)
            }
        }
        i.q[dev] = keep
    }
    i.mu.Unlock()
}

func newID() string {
    b := make([]byte, 8)
    _, _ = rand.Read(b)
    return hex.EncodeToString(b)
}

func (s *Store) put(b *Blob) string {
    id := newID()
    s.mu.Lock()
    s.m[id] = b
    s.mu.Unlock()
    return id
}

func (s *Store) getOnce(id string) (*Blob, bool) {
    s.mu.Lock()
    defer s.mu.Unlock()
    b, ok := s.m[id]
    if !ok {
        return nil, false
    }
    delete(s.m, id)
    return b, true
}

func (s *Store) purgeExpired() {
    ticker := time.NewTicker(1 * time.Second)
    for range ticker.C {
        now := time.Now()
        s.mu.Lock()
        for id, b := range s.m {
            ttl := time.Duration(b.TTLms) * time.Millisecond
            if now.Sub(b.Created) > ttl {
                delete(s.m, id)
            }
        }
        s.mu.Unlock()
    }
}

func main() {
    s := &Store{m: make(map[string]*Blob)}
    r := &Registry{tokens: make(map[string]Token), devices: make(map[string]Device)}
    inbox := &Inbox{q: make(map[string][]string)}
    syncStore := &SyncStore{m: make(map[string][]byte)}
    audit := &Audit{}
    idreg := &IDRegistry{m: make(map[string]string)}
    acks := &AckQueue{q: make(map[string][]Ack)}
    go func() {
        ticker := time.NewTicker(1 * time.Second)
        for range ticker.C {
            now := time.Now()
            s.mu.Lock()
            for id, b := range s.m {
                ttl := time.Duration(b.TTLms) * time.Millisecond
                if now.Sub(b.Created) > ttl {
                    delete(s.m, id)
                    audit.add(id, "expire")
                }
            }
            s.mu.Unlock()
        }
    }()
    go func() {
        t := time.NewTicker(2 * time.Second)
        for range t.C {
            inbox.purgeMissing(s)
        }
    }()

    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        _, _ = w.Write([]byte("ok"))
    })

    http.HandleFunc("/relay", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }
        var b Blob
        dec := json.NewDecoder(r.Body)
        if err := dec.Decode(&b); err != nil {
            w.WriteHeader(http.StatusBadRequest)
            return
        }
        const maxTTLms = 30000
        if b.TTLms == 0 {
            b.TTLms = 5000
        }
        if b.TTLms != 5000 && b.TTLms != 10000 {
            if b.TTLms > maxTTLms {
                b.TTLms = 5000
            }
        }
        b.Created = time.Now()
        id := s.put(&b)
        audit.add(id, "upload")
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(map[string]string{"id": id})
    })

    http.HandleFunc("/blob/", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodGet {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }
        id := r.URL.Path[len("/blob/"):]
        b, ok := s.getOnce(id)
        if !ok {
            w.WriteHeader(http.StatusNotFound)
            return
        }
        audit.add(id, "view")
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(b)
    })

    http.HandleFunc("/provision/start", func(w http.ResponseWriter, req *http.Request) {
        if req.Method != http.MethodPost {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }
        b := make([]byte, 16)
        _, _ = rand.Read(b)
        id := hex.EncodeToString(b)
        t := Token{ID: id, Exp: time.Now().Add(60 * time.Second)}
        r.mu.Lock()
        r.tokens[id] = t
        r.mu.Unlock()
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(map[string]string{"token": id})
    })

    http.HandleFunc("/provision/complete", func(w http.ResponseWriter, req *http.Request) {
        if req.Method != http.MethodPost {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }
        var payload struct {
            Token string `json:"token"`
            DeviceID string `json:"device_id"`
            PubKey string `json:"pubkey"`
        }
        dec := json.NewDecoder(req.Body)
        if err := dec.Decode(&payload); err != nil {
            w.WriteHeader(http.StatusBadRequest)
            return
        }
        r.mu.Lock()
        t, ok := r.tokens[payload.Token]
        if !ok || time.Now().After(t.Exp) {
            r.mu.Unlock()
            w.WriteHeader(http.StatusBadRequest)
            return
        }
        delete(r.tokens, payload.Token)
        pk, err := base64.StdEncoding.DecodeString(payload.PubKey)
        if err != nil {
            r.mu.Unlock()
            w.WriteHeader(http.StatusBadRequest)
            return
        }
        d := Device{ID: payload.DeviceID, PubKey: pk, Created: time.Now()}
        r.devices[d.ID] = d
        r.mu.Unlock()
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
    })

    http.HandleFunc("/device/", func(w http.ResponseWriter, req *http.Request) {
        if req.Method != http.MethodGet {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }
        id := req.URL.Path[len("/device/"):]
        r.mu.Lock()
        d, ok := r.devices[id]
        r.mu.Unlock()
        if !ok {
            w.WriteHeader(http.StatusNotFound)
            return
        }
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(map[string]string{
            "id": d.ID,
            "pubkey": base64.StdEncoding.EncodeToString(d.PubKey),
        })
    })

    http.HandleFunc("/send", func(w http.ResponseWriter, req *http.Request) {
        if req.Method != http.MethodPost {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }
        var payload struct {
            DeviceID string `json:"device_id"`
            IV []byte `json:"iv"`
            Data []byte `json:"data"`
            Tag []byte `json:"tag"`
            TTLms int `json:"ttl_ms"`
            SenderID string `json:"sender_id"`
            PassHash []byte `json:"pass_hash"`
            Salt []byte `json:"salt"`
        }
        dec := json.NewDecoder(req.Body)
        if err := dec.Decode(&payload); err != nil {
            w.WriteHeader(http.StatusBadRequest)
            return
        }
        const maxTTLms = 30000
        if payload.TTLms == 0 {
            payload.TTLms = 5000
        }
        if payload.TTLms != 5000 && payload.TTLms != 10000 {
            if payload.TTLms > maxTTLms {
                payload.TTLms = 5000
            }
        }
        b := &Blob{IV: payload.IV, Data: payload.Data, Tag: payload.Tag, TTLms: payload.TTLms, Created: time.Now(), PassHash: payload.PassHash, SenderID: payload.SenderID, Salt: payload.Salt}
        id := s.put(b)
        inbox.push(payload.DeviceID, id)
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(map[string]string{"id": id})
    })

    http.HandleFunc("/inbox/", func(w http.ResponseWriter, req *http.Request) {
        if req.Method != http.MethodGet {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }
        dev := req.URL.Path[len("/inbox/"):]
        id, ok := inbox.pop(dev)
        if !ok {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        s.mu.Lock()
        b := s.m[id]
        var saltB64 string
        if b != nil && len(b.Salt) > 0 {
            saltB64 = base64.StdEncoding.EncodeToString(b.Salt)
        }
        s.mu.Unlock()
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(map[string]string{"id": id, "salt": saltB64})
    })

    http.HandleFunc("/audit", func(w http.ResponseWriter, req *http.Request) {
        if req.Method != http.MethodGet {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }
        list := audit.list()
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(list)
    })

    http.HandleFunc("/sync/put", func(w http.ResponseWriter, req *http.Request) {
        if req.Method != http.MethodPost {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }
        var payload struct {
            DeviceID string `json:"device_id"`
            Envelope string `json:"envelope"`
        }
        dec := json.NewDecoder(req.Body)
        if err := dec.Decode(&payload); err != nil {
            w.WriteHeader(http.StatusBadRequest)
            return
        }
        env, err := base64.StdEncoding.DecodeString(payload.Envelope)
        if err != nil {
            w.WriteHeader(http.StatusBadRequest)
            return
        }
        syncStore.put(payload.DeviceID, env)
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
    })

    http.HandleFunc("/sync/", func(w http.ResponseWriter, req *http.Request) {
        if req.Method != http.MethodGet {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }
        dev := req.URL.Path[len("/sync/"):]
        env, ok := syncStore.get(dev)
        if !ok {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(map[string]string{"envelope": base64.StdEncoding.EncodeToString(env)})
    })

    http.HandleFunc("/gate/", func(w http.ResponseWriter, req *http.Request) {
        if req.Method != http.MethodPost {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }
        id := req.URL.Path[len("/gate/"):]
        var payload struct { PassHash []byte `json:"pass_hash"` }
        dec := json.NewDecoder(req.Body)
        if err := dec.Decode(&payload); err != nil {
            w.WriteHeader(http.StatusBadRequest)
            return
        }
        b, ok := s.getOnce(id)
        if !ok {
            w.WriteHeader(http.StatusNotFound)
            return
        }
        match := len(b.PassHash) > 0 && string(b.PassHash) == string(payload.PassHash)
        if match {
            audit.add(id, "view")
            w.Header().Set("Content-Type", "application/json")
            _ = json.NewEncoder(w).Encode(b)
            return
        }
        if b.SenderID != "" {
            acks.push(b.SenderID, Ack{BlobID: id, Status: "no_delivery", Time: time.Now()})
        }
        w.WriteHeader(http.StatusForbidden)
    })

    http.HandleFunc("/ack/", func(w http.ResponseWriter, req *http.Request) {
        if req.Method != http.MethodGet {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }
        dev := req.URL.Path[len("/ack/"):]
        a, ok := acks.pop(dev)
        if !ok {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(a)
    })

    http.HandleFunc("/id/register", func(w http.ResponseWriter, req *http.Request) {
        if req.Method != http.MethodPost {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }
        var payload struct {
            DeviceID string `json:"device_id"`
            ZeusID string `json:"zeus_id"`
        }
        dec := json.NewDecoder(req.Body)
        if err := dec.Decode(&payload); err != nil {
            w.WriteHeader(http.StatusBadRequest)
            return
        }
        idreg.mu.Lock()
        idreg.m[payload.ZeusID] = payload.DeviceID
        idreg.mu.Unlock()
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
    })

    http.HandleFunc("/id/", func(w http.ResponseWriter, req *http.Request) {
        if req.Method != http.MethodGet {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }
        code := req.URL.Path[len("/id/"):]
        idreg.mu.Lock()
        dev, ok := idreg.m[code]
        idreg.mu.Unlock()
        if !ok {
            w.WriteHeader(http.StatusNotFound)
            return
        }
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(map[string]string{"device_id": dev})
    })

    log.Println("relay: listening on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
type AuditRecord struct {
    ID string `json:"id"`
    Action string `json:"action"`
    Time time.Time `json:"time"`
}

type Audit struct {
    records []AuditRecord
    mu sync.Mutex
}

func (a *Audit) add(id, action string) {
    a.mu.Lock()
    a.records = append(a.records, AuditRecord{ID: id, Action: action, Time: time.Now()})
    a.mu.Unlock()
}

func (a *Audit) list() []AuditRecord {
    a.mu.Lock()
    out := make([]AuditRecord, len(a.records))
    copy(out, a.records)
    a.mu.Unlock()
    return out
}
type SyncStore struct {
    m map[string][]byte
    mu sync.Mutex
}

func (ss *SyncStore) put(dev string, env []byte) {
    ss.mu.Lock()
    ss.m[dev] = env
    ss.mu.Unlock()
}

func (ss *SyncStore) get(dev string) ([]byte, bool) {
    ss.mu.Lock()
    env, ok := ss.m[dev]
    if ok {
        delete(ss.m, dev)
    }
    ss.mu.Unlock()
    return env, ok
}
