package main

import (
	"errors"
	"math/big"
	"regexp"
	"strings"
)

// Fee Configuration
const (
	MinGasPrice       = 1000000000      // 1 Gwei in wei
	MaxGasPrice       = 1000000000000   // 1000 Gwei in wei
	MinGasLimit       = 21000            // Minimum gas for simple transfer
	MaxGasLimit       = 30000000         // Maximum gas per transaction
	BaseFee           = 100000000000000 // 0.0001 GYDS in wei
	MaxTransactionFee = 1000000000000000000 // 1 GYDS max fee
)

// ValidateAddress checks if address format is valid
func ValidateAddress(address string) error {
	if !strings.HasPrefix(address, "0x") {
		return errors.New("address must start with 0x")
	}

	if len(address) != 42 {
		return errors.New("address must be 42 characters (0x + 40 hex chars)")
	}

	match, _ := regexp.MatchString("^0x[0-9a-fA-F]{40}$", address)
	if !match {
		return errors.New("address contains invalid characters")
	}

	return nil
}

// ValidateAmount checks if transaction amount is valid
func ValidateAmount(amountStr string) error {
	amount := new(big.Int)
	_, ok := amount.SetString(amountStr, 10)
	if !ok {
		return errors.New("invalid amount format")
	}

	if amount.Cmp(big.NewInt(0)) <= 0 {
		return errors.New("amount must be greater than 0")
	}

	maxAmount := new(big.Int)
	maxAmount.SetString("100000000000000000000000000", 10) // 100M GYDS in wei
	if amount.Cmp(maxAmount) > 0 {
		return errors.New("amount exceeds maximum allowed")
	}

	return nil
}

// ValidateGas checks if gas parameters are valid
func ValidateGas(gas int64, gasPriceStr string) error {
	if gas < MinGasLimit {
		return errors.New("gas limit too low")
	}

	if gas > MaxGasLimit {
		return errors.New("gas limit too high")
	}

	gasPrice := new(big.Int)
	_, ok := gasPrice.SetString(gasPriceStr, 10)
	if !ok {
		return errors.New("invalid gas price format")
	}

	minGasPrice := big.NewInt(MinGasPrice)
	maxGasPrice := big.NewInt(MaxGasPrice)

	if gasPrice.Cmp(minGasPrice) < 0 {
		return errors.New("gas price too low")
	}

	if gasPrice.Cmp(maxGasPrice) > 0 {
		return errors.New("gas price too high")
	}

	return nil
}

// CalculateTransactionFee calculates total transaction fee
func CalculateTransactionFee(gas int64, gasPriceStr string) (*big.Int, error) {
	gasPrice := new(big.Int)
	_, ok := gasPrice.SetString(gasPriceStr, 10)
	if !ok {
		return nil, errors.New("invalid gas price")
	}

	fee := new(big.Int).Mul(big.NewInt(gas), gasPrice)
	
	// Add base fee
	baseFee := big.NewInt(BaseFee)
	fee.Add(fee, baseFee)

	maxFee := big.NewInt(MaxTransactionFee)
	if fee.Cmp(maxFee) > 0 {
		return nil, errors.New("transaction fee exceeds maximum allowed")
	}

	return fee, nil
}

// ValidateTransaction performs complete transaction validation
func ValidateTransaction(tx *Transaction) error {
	// Validate addresses
	if err := ValidateAddress(tx.From); err != nil {
		return errors.New("invalid from address: " + err.Error())
	}

	if err := ValidateAddress(tx.To); err != nil {
		return errors.New("invalid to address: " + err.Error())
	}

	// Cannot send to self
	if tx.From == tx.To {
		return errors.New("cannot send to same address")
	}

	// Validate amount
	if err := ValidateAmount(tx.Value); err != nil {
		return errors.New("invalid amount: " + err.Error())
	}

	// Validate gas
	if err := ValidateGas(tx.Gas, tx.GasPrice); err != nil {
		return errors.New("invalid gas: " + err.Error())
	}

	// Validate nonce
	if tx.Nonce < 0 {
		return errors.New("nonce cannot be negative")
	}

	// Calculate and validate total fee
	fee, err := CalculateTransactionFee(tx.Gas, tx.GasPrice)
	if err != nil {
		return errors.New("fee calculation error: " + err.Error())
	}

	// Validate total cost (amount + fee)
	amount := new(big.Int)
	amount.SetString(tx.Value, 10)
	totalCost := new(big.Int).Add(amount, fee)

	maxSupply := new(big.Int)
	maxSupply.SetString("100000000000000000000000000", 10)
	if totalCost.Cmp(maxSupply) > 0 {
		return errors.New("total transaction cost exceeds maximum supply")
	}

	return nil
}

// ValidateMnemonic checks if mnemonic phrase is valid format
func ValidateMnemonic(mnemonic string) error {
	words := strings.Fields(mnemonic)
	
	if len(words) != 12 {
		return errors.New("mnemonic must be exactly 12 words")
	}

	for _, word := range words {
		if len(word) < 3 {
			return errors.New("invalid word in mnemonic")
		}
	}

	return nil
}

// ValidateBlock performs block validation
func ValidateBlock(block *Block, previousBlock *Block) error {
	// Validate index
	if block.Index != previousBlock.Index+1 {
		return errors.New("invalid block index")
	}

	// Validate previous hash
	if block.PreviousHash != previousBlock.Hash {
		return errors.New("invalid previous hash")
	}

	// Validate timestamp
	if block.Timestamp <= previousBlock.Timestamp {
		return errors.New("block timestamp must be after previous block")
	}

	// Validate block type
	if block.Type != "POW" && block.Type != "POS" && block.Type != "GENESIS" {
		return errors.New("invalid block type")
	}

	// Validate POW blocks
	if block.Type == "POW" {
		if block.Miner == "" {
			return errors.New("POW block must have miner")
		}
		if err := ValidateAddress(block.Miner); err != nil {
			return errors.New("invalid miner address")
		}
	}

	// Validate POS blocks
	if block.Type == "POS" {
		if block.Validator == "" {
			return errors.New("POS block must have validator")
		}
		if err := ValidateAddress(block.Validator); err != nil {
			return errors.New("invalid validator address")
		}
	}

	return nil
}
