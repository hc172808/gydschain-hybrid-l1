package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"

	"golang.org/x/crypto/pbkdf2"
)

// Account represents a blockchain account
type Account struct {
	Address    string `json:"address"`
	PrivateKey string `json:"privateKey"`
	PublicKey  string `json:"publicKey"`
	Mnemonic   string `json:"mnemonic,omitempty"`
}

// Simple word list for mnemonic generation (BIP39 subset)
var wordList = []string{
	"abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
	"absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid",
	"acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual",
	"adapt", "add", "addict", "address", "adjust", "admit", "adult", "advance",
	"advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent",
	"agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album",
	"alcohol", "alert", "alien", "all", "alley", "allow", "almost", "alone",
	"alpha", "already", "also", "alter", "always", "amateur", "amazing", "among",
	"amount", "amused", "analyst", "anchor", "ancient", "anger", "angle", "angry",
	"animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique",
	"anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april",
	"arch", "arctic", "area", "arena", "argue", "arm", "armed", "armor",
	"army", "around", "arrange", "arrest", "arrive", "arrow", "art", "artefact",
	"artist", "artwork", "ask", "aspect", "assault", "asset", "assist", "assume",
	"asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction",
	"audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado",
	"avoid", "awake", "aware", "away", "awesome", "awful", "awkward", "axis",
}

// GenerateMnemonic creates a 12-word seed phrase
func GenerateMnemonic() (string, error) {
	entropy := make([]byte, 16) // 128 bits for 12 words
	if _, err := rand.Read(entropy); err != nil {
		return "", err
	}

	mnemonic := ""
	for i := 0; i < 12; i++ {
		index := int(entropy[i]) % len(wordList)
		if i > 0 {
			mnemonic += " "
		}
		mnemonic += wordList[index]
	}

	return mnemonic, nil
}

// MnemonicToSeed converts mnemonic to seed
func MnemonicToSeed(mnemonic string) []byte {
	return pbkdf2.Key([]byte(mnemonic), []byte("gydschain"), 2048, 64, sha256.New)
}

// GenerateKeyPairFromSeed generates ECDSA key pair from seed
func GenerateKeyPairFromSeed(seed []byte) (*ecdsa.PrivateKey, error) {
	curve := elliptic.P256()
	privateKey := new(ecdsa.PrivateKey)
	privateKey.PublicKey.Curve = curve
	privateKey.D = new(big.Int).SetBytes(seed[:32])

	// Ensure D is in valid range
	n := curve.Params().N
	if privateKey.D.Cmp(n) >= 0 {
		privateKey.D.Mod(privateKey.D, n)
	}

	privateKey.PublicKey.X, privateKey.PublicKey.Y = curve.ScalarBaseMult(privateKey.D.Bytes())
	return privateKey, nil
}

// PrivateKeyToAddress converts private key to blockchain address
func PrivateKeyToAddress(privateKey *ecdsa.PrivateKey) string {
	pubKey := append(privateKey.PublicKey.X.Bytes(), privateKey.PublicKey.Y.Bytes()...)
	hash := sha256.Sum256(pubKey)
	return "0x" + hex.EncodeToString(hash[:])[:40]
}

// CreateAccount generates a new blockchain account with mnemonic
func CreateAccount() (*Account, error) {
	mnemonic, err := GenerateMnemonic()
	if err != nil {
		return nil, err
	}

	seed := MnemonicToSeed(mnemonic)
	privateKey, err := GenerateKeyPairFromSeed(seed)
	if err != nil {
		return nil, err
	}

	address := PrivateKeyToAddress(privateKey)
	privateKeyHex := hex.EncodeToString(privateKey.D.Bytes())
	publicKeyHex := hex.EncodeToString(append(privateKey.PublicKey.X.Bytes(), privateKey.PublicKey.Y.Bytes()...))

	return &Account{
		Address:    address,
		PrivateKey: privateKeyHex,
		PublicKey:  publicKeyHex,
		Mnemonic:   mnemonic,
	}, nil
}

// RecoverAccountFromMnemonic recovers account from mnemonic phrase
func RecoverAccountFromMnemonic(mnemonic string) (*Account, error) {
	seed := MnemonicToSeed(mnemonic)
	privateKey, err := GenerateKeyPairFromSeed(seed)
	if err != nil {
		return nil, err
	}

	address := PrivateKeyToAddress(privateKey)
	privateKeyHex := hex.EncodeToString(privateKey.D.Bytes())
	publicKeyHex := hex.EncodeToString(append(privateKey.PublicKey.X.Bytes(), privateKey.PublicKey.Y.Bytes()...))

	return &Account{
		Address:    address,
		PrivateKey: privateKeyHex,
		PublicKey:  publicKeyHex,
		Mnemonic:   mnemonic,
	}, nil
}

// SignTransaction signs a transaction with private key
func SignTransaction(tx *Transaction, privateKeyHex string) error {
	privateKeyBytes, err := hex.DecodeString(privateKeyHex)
	if err != nil {
		return err
	}

	curve := elliptic.P256()
	privateKey := new(ecdsa.PrivateKey)
	privateKey.PublicKey.Curve = curve
	privateKey.D = new(big.Int).SetBytes(privateKeyBytes)
	privateKey.PublicKey.X, privateKey.PublicKey.Y = curve.ScalarBaseMult(privateKey.D.Bytes())

	// Create transaction hash
	txData := fmt.Sprintf("%s%s%s%d%s%d",
		tx.From, tx.To, tx.Value, tx.Gas, tx.GasPrice, tx.Nonce)
	hash := sha256.Sum256([]byte(txData))
	tx.Hash = hex.EncodeToString(hash[:])

	return nil
}
