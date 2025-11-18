package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"sync"
	"time"
)

// Chain Configuration
type ChainConfig struct {
	ChainID     int64  `json:"chainId"`
	NetworkID   int64  `json:"networkId"`
	ChainName   string `json:"chainName"`
	MaxSupply   string `json:"maximumSupply"`
	BlockTime   int    `json:"blockTime"`
	POWEnabled  bool   `json:"powEnabled"`
	POSEnabled  bool   `json:"posEnabled"`
	BlockReward string `json:"blockReward"`
	StakeReward string `json:"stakeReward"`
}

// Block structure
type Block struct {
	Index        int64             `json:"index"`
	Timestamp    int64             `json:"timestamp"`
	Transactions []Transaction     `json:"transactions"`
	PreviousHash string            `json:"previousHash"`
	Hash         string            `json:"hash"`
	Nonce        int64             `json:"nonce"`
	Difficulty   int64             `json:"difficulty"`
	Miner        string            `json:"miner"`
	Validator    string            `json:"validator"`
	Type         string            `json:"type"` // "POW" or "POS"
	Reward       string            `json:"reward"`
}

// Transaction structure
type Transaction struct {
	From      string `json:"from"`
	To        string `json:"to"`
	Value     string `json:"value"`
	Gas       int64  `json:"gas"`
	GasPrice  string `json:"gasPrice"`
	Nonce     int64  `json:"nonce"`
	Hash      string `json:"hash"`
	Timestamp int64  `json:"timestamp"`
}

// Validator structure
type Validator struct {
	Address      string `json:"address"`
	Stake        string `json:"stake"`
	Active       bool   `json:"active"`
	JoinedAt     int64  `json:"joinedAt"`
	BlocksMinted int    `json:"blocksMinted"`
}

// Blockchain structure
type Blockchain struct {
	Blocks          []Block              `json:"blocks"`
	PendingTxs      []Transaction        `json:"pendingTxs"`
	Validators      map[string]Validator `json:"validators"`
	TotalSupply     *big.Int             `json:"totalSupply"`
	Config          ChainConfig          `json:"config"`
	CurrentDiff     int64                `json:"currentDifficulty"`
	LastPOWBlock    int64                `json:"lastPOWBlock"`
	LastPOSBlock    int64                `json:"lastPOSBlock"`
	mu              sync.RWMutex
}

var blockchain *Blockchain
var nodeAddress = generateAddress()

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8545"
	}

	// Initialize blockchain
	blockchain = initBlockchain()
	
	log.Printf("🚀 GYDSchain Node Starting...")
	log.Printf("📍 Node Address: %s", nodeAddress)
	log.Printf("⛓️  Chain ID: %d", blockchain.Config.ChainID)
	log.Printf("🌐 RPC Port: %s", port)
	
	// Start mining/validation routines
	go miningLoop()
	go validationLoop()
	
	// Setup HTTP handlers
	http.HandleFunc("/", handleHome)
	http.HandleFunc("/rpc", handleRPC)
	http.HandleFunc("/blocks", handleBlocks)
	http.HandleFunc("/block/", handleBlock)
	http.HandleFunc("/transactions", handleTransactions)
	http.HandleFunc("/validators", handleValidators)
	http.HandleFunc("/stake", handleStake)
	http.HandleFunc("/stats", handleStats)
	http.HandleFunc("/health", handleHealth)
	http.HandleFunc("/wallet/create", handleCreateWallet)
	http.HandleFunc("/wallet/recover", handleRecoverWallet)
	http.HandleFunc("/transaction/send", handleSendTransaction)
	http.HandleFunc("/transaction/fee", handleCalculateFee)
	
	log.Printf("✅ Node ready on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, enableCORS(http.DefaultServeMux)))
}

func initBlockchain() *Blockchain {
	maxSupply := new(big.Int)
	maxSupply.SetString("100000000000000000000000000", 10)
	
	genesis := Block{
		Index:        0,
		Timestamp:    time.Now().Unix(),
		Transactions: []Transaction{},
		PreviousHash: "0",
		Difficulty:   0x20000,
		Miner:        "genesis",
		Type:         "GENESIS",
		Reward:       "0",
	}
	genesis.Hash = calculateHash(genesis)
	
	return &Blockchain{
		Blocks:      []Block{genesis},
		PendingTxs:  []Transaction{},
		Validators:  make(map[string]Validator),
		TotalSupply: big.NewInt(0),
		Config: ChainConfig{
			ChainID:     9125,
			NetworkID:   9125,
			ChainName:   "GYDSchain",
			MaxSupply:   "100000000000000000000000000",
			BlockTime:   120,
			POWEnabled:  true,
			POSEnabled:  true,
			BlockReward: "3000000000000000000",
			StakeReward: "1000000000000000000",
		},
		CurrentDiff:  0x20000,
		LastPOWBlock: 0,
		LastPOSBlock: 0,
	}
}

func miningLoop() {
	for {
		if blockchain.Config.POWEnabled {
			time.Sleep(time.Duration(blockchain.Config.BlockTime) * time.Second)
			minePOWBlock()
		}
	}
}

func validationLoop() {
	for {
		if blockchain.Config.POSEnabled && len(blockchain.Validators) > 0 {
			time.Sleep(time.Duration(blockchain.Config.BlockTime) * time.Second)
			mintPOSBlock()
		}
	}
}

func minePOWBlock() {
	blockchain.mu.Lock()
	defer blockchain.mu.Unlock()
	
	// Check max supply
	maxSupply := new(big.Int)
	maxSupply.SetString(blockchain.Config.MaxSupply, 10)
	if blockchain.TotalSupply.Cmp(maxSupply) >= 0 {
		return
	}
	
	lastBlock := blockchain.Blocks[len(blockchain.Blocks)-1]
	newBlock := Block{
		Index:        lastBlock.Index + 1,
		Timestamp:    time.Now().Unix(),
		Transactions: blockchain.PendingTxs,
		PreviousHash: lastBlock.Hash,
		Difficulty:   blockchain.CurrentDiff,
		Miner:        nodeAddress,
		Type:         "POW",
		Reward:       blockchain.Config.BlockReward,
	}
	
	// Simple POW - find nonce that creates hash with leading zeros
	for {
		newBlock.Hash = calculateHash(newBlock)
		if isValidPOW(newBlock.Hash, blockchain.CurrentDiff) {
			break
		}
		newBlock.Nonce++
	}
	
	blockchain.Blocks = append(blockchain.Blocks, newBlock)
	blockchain.PendingTxs = []Transaction{}
	blockchain.LastPOWBlock = newBlock.Index
	
	// Update supply
	reward := new(big.Int)
	reward.SetString(blockchain.Config.BlockReward, 10)
	blockchain.TotalSupply.Add(blockchain.TotalSupply, reward)
	
	// Adjust difficulty every 10 blocks
	if newBlock.Index%10 == 0 {
		adjustDifficulty()
	}
	
	log.Printf("⛏️  POW Block #%d mined by %s", newBlock.Index, nodeAddress[:8])
}

func mintPOSBlock() {
	blockchain.mu.Lock()
	defer blockchain.mu.Unlock()
	
	// Check max supply
	maxSupply := new(big.Int)
	maxSupply.SetString(blockchain.Config.MaxSupply, 10)
	if blockchain.TotalSupply.Cmp(maxSupply) >= 0 {
		return
	}
	
	// Select validator (simplified random)
	var selectedValidator string
	for addr, val := range blockchain.Validators {
		if val.Active {
			selectedValidator = addr
			break
		}
	}
	
	if selectedValidator == "" {
		return
	}
	
	lastBlock := blockchain.Blocks[len(blockchain.Blocks)-1]
	newBlock := Block{
		Index:        lastBlock.Index + 1,
		Timestamp:    time.Now().Unix(),
		Transactions: blockchain.PendingTxs,
		PreviousHash: lastBlock.Hash,
		Validator:    selectedValidator,
		Type:         "POS",
		Reward:       blockchain.Config.StakeReward,
	}
	newBlock.Hash = calculateHash(newBlock)
	
	blockchain.Blocks = append(blockchain.Blocks, newBlock)
	blockchain.PendingTxs = []Transaction{}
	blockchain.LastPOSBlock = newBlock.Index
	
	// Update validator stats
	if val, ok := blockchain.Validators[selectedValidator]; ok {
		val.BlocksMinted++
		blockchain.Validators[selectedValidator] = val
	}
	
	// Update supply
	reward := new(big.Int)
	reward.SetString(blockchain.Config.StakeReward, 10)
	blockchain.TotalSupply.Add(blockchain.TotalSupply, reward)
	
	log.Printf("🗳️  POS Block #%d minted by validator %s", newBlock.Index, selectedValidator[:8])
}

func calculateHash(block Block) string {
	record := fmt.Sprintf("%d%d%s%d%s%s%d", 
		block.Index, block.Timestamp, block.PreviousHash, 
		block.Nonce, block.Miner, block.Validator, block.Difficulty)
	h := sha256.New()
	h.Write([]byte(record))
	return hex.EncodeToString(h.Sum(nil))
}

func isValidPOW(hash string, difficulty int64) bool {
	// Simplified: check if hash is less than difficulty target
	hashInt := new(big.Int)
	hashInt.SetString(hash, 16)
	target := new(big.Int).Lsh(big.NewInt(1), uint(256-difficulty/0x1000))
	return hashInt.Cmp(target) < 0
}

func adjustDifficulty() {
	// Bitcoin-style difficulty adjustment
	if len(blockchain.Blocks) < 10 {
		return
	}
	
	expectedTime := int64(blockchain.Config.BlockTime * 10)
	actualTime := blockchain.Blocks[len(blockchain.Blocks)-1].Timestamp - 
		blockchain.Blocks[len(blockchain.Blocks)-10].Timestamp
	
	if actualTime < expectedTime/2 {
		blockchain.CurrentDiff = blockchain.CurrentDiff * 2
	} else if actualTime > expectedTime*2 {
		blockchain.CurrentDiff = blockchain.CurrentDiff / 2
	}
	
	if blockchain.CurrentDiff < 0x10000 {
		blockchain.CurrentDiff = 0x10000
	}
}

func generateAddress() string {
	h := sha256.New()
	h.Write([]byte(fmt.Sprintf("%d", time.Now().UnixNano())))
	return "0x" + hex.EncodeToString(h.Sum(nil))[:40]
}

// HTTP Handlers
func handleHome(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]interface{}{
		"chain":    "GYDSchain",
		"version":  "1.0.0",
		"node":     nodeAddress,
		"status":   "running",
		"chainId":  blockchain.Config.ChainID,
	})
}

func handleBlocks(w http.ResponseWriter, r *http.Request) {
	blockchain.mu.RLock()
	defer blockchain.mu.RUnlock()
	json.NewEncoder(w).Encode(blockchain.Blocks)
}

func handleBlock(w http.ResponseWriter, r *http.Request) {
	// Implementation for specific block
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func handleTransactions(w http.ResponseWriter, r *http.Request) {
	blockchain.mu.RLock()
	defer blockchain.mu.RUnlock()
	json.NewEncoder(w).Encode(blockchain.PendingTxs)
}

func handleValidators(w http.ResponseWriter, r *http.Request) {
	blockchain.mu.RLock()
	defer blockchain.mu.RUnlock()
	json.NewEncoder(w).Encode(blockchain.Validators)
}

func handleStake(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var req struct {
		Address string `json:"address"`
		Amount  string `json:"amount"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	blockchain.mu.Lock()
	defer blockchain.mu.Unlock()
	
	// Check if validator slots available
	if len(blockchain.Validators) >= 21 {
		http.Error(w, "Validator slots full", http.StatusBadRequest)
		return
	}
	
	blockchain.Validators[req.Address] = Validator{
		Address:      req.Address,
		Stake:        req.Amount,
		Active:       true,
		JoinedAt:     time.Now().Unix(),
		BlocksMinted: 0,
	}
	
	json.NewEncoder(w).Encode(map[string]string{"status": "staked"})
}

func handleStats(w http.ResponseWriter, r *http.Request) {
	blockchain.mu.RLock()
	defer blockchain.mu.RUnlock()
	
	maxSupply := new(big.Int)
	maxSupply.SetString(blockchain.Config.MaxSupply, 10)
	
	json.NewEncoder(w).Encode(map[string]interface{}{
		"blockHeight":    len(blockchain.Blocks) - 1,
		"totalSupply":    blockchain.TotalSupply.String(),
		"maxSupply":      blockchain.Config.MaxSupply,
		"validators":     len(blockchain.Validators),
		"pendingTxs":     len(blockchain.PendingTxs),
		"difficulty":     blockchain.CurrentDiff,
		"lastPOWBlock":   blockchain.LastPOWBlock,
		"lastPOSBlock":   blockchain.LastPOSBlock,
		"nodeAddress":    nodeAddress,
	})
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func handleRPC(w http.ResponseWriter, r *http.Request) {
	// JSON-RPC 2.0 handler
	var req struct {
		JSONRPC string        `json:"jsonrpc"`
		Method  string        `json:"method"`
		Params  []interface{} `json:"params"`
		ID      interface{}   `json:"id"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	// Handle different RPC methods
	response := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      req.ID,
	}
	
	switch req.Method {
	case "eth_chainId":
		response["result"] = fmt.Sprintf("0x%x", blockchain.Config.ChainID)
	case "eth_blockNumber":
		response["result"] = fmt.Sprintf("0x%x", len(blockchain.Blocks)-1)
	case "net_version":
		response["result"] = fmt.Sprintf("%d", blockchain.Config.NetworkID)
	default:
		response["error"] = map[string]interface{}{
			"code":    -32601,
			"message": "Method not found",
		}
	}
	
	json.NewEncoder(w).Encode(response)
}

func handleCreateWallet(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	account, err := CreateAccount()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(account)
}

func handleRecoverWallet(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Mnemonic string `json:"mnemonic"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := ValidateMnemonic(req.Mnemonic); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	account, err := RecoverAccountFromMnemonic(req.Mnemonic)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(account)
}

func handleSendTransaction(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Transaction Transaction `json:"transaction"`
		PrivateKey  string      `json:"privateKey"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Validate transaction
	if err := ValidateTransaction(&req.Transaction); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Sign transaction
	if err := SignTransaction(&req.Transaction, req.PrivateKey); err != nil {
		http.Error(w, "Failed to sign transaction", http.StatusInternalServerError)
		return
	}

	// Add to pending transactions
	blockchain.mu.Lock()
	req.Transaction.Timestamp = time.Now().Unix()
	blockchain.PendingTxs = append(blockchain.PendingTxs, req.Transaction)
	blockchain.mu.Unlock()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "pending",
		"hash":   req.Transaction.Hash,
	})
}

func handleCalculateFee(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Gas      int64  `json:"gas"`
		GasPrice string `json:"gasPrice"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	fee, err := CalculateTransactionFee(req.Gas, req.GasPrice)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"fee":      fee.String(),
		"baseFee":  BaseFee,
		"gasPrice": req.GasPrice,
		"gasLimit": req.Gas,
	})
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		w.Header().Set("Content-Type", "application/json")
		next.ServeHTTP(w, r)
	})
}
