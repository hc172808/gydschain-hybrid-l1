FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY main.go .
COPY go.mod .

RUN go mod download || go mod init gydschain
RUN go build -o gydschain-node main.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/gydschain-node .
COPY ../genesis.json ./genesis.json

EXPOSE 8545 30303

CMD ["./gydschain-node"]
