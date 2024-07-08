<div align="center">
<br>
<img style="align: center" src="./logo.png" height=256/>
<h1>Aligned TS</h1>
<strong>TypeScript SDK for Aligned Layer</strong>
</div>
<br>

Aligned TS is the TypeScript equivalent of the Aligned Layer Rust SDK.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Getting Started](#getting-started)
  - [Installation Documentation](#installation-documentation)
  - [Build locally](#build-locally)
  - [API Reference](#api-reference)

## Getting Started

AlignedTS is the TypeScript equivalent of the Aligned Layer Rust SDK.
It implements all the necessary communication with the Batcher, commitment of data verification data blobs and handles the Batchers response.

### Installation Documentation

### Build locally

In order to build this project locally, simply clone the repository and run

```sh
npm ci
npm run build
npm run test
```

### API Reference

Your main interaction with the SDK will be the `getAligned()` function, which initiates a new instance of the SDK that you can use to interact with a Batcher.

```ts
const getAligned: (address?: string) => Aligned;
```

`address?: string`: (Websocket) address of the Batcher you want to interact with. Default: `wss://batcher.alignedlayer.com`
returns `Aligned`: The Aligned SDK object, see below for more information.

<br>

```ts
type Aligned = {
  submit: (
    verificationData: VerificationData,
    wallet: ethers.Wallet
  ) => Promise<AlignedVerificationData>;
  submitMultiple: (
    verificationData: Array<VerificationData>,
    wallet: ethers.Wallet
  ) => Promise<Array<AlignedVerificationData>>;
  verifyProofOnchain: (
    verificationData: AlignedVerificationData,
    chain: "devnet" | "holesky",
    provide: ethers.Provider
  ) => Promise<any>;
  getDefaultBatcherAddress: () => string;
  getCurrentBatcherAddress: () => string;
  setCurrentBatcherAddress: (address: string) => void;
  getExplorerLink: (batchMerkleRoot: Uint8Array) => string;
  getVerificationKeyCommitment: (vk: Buffer) => string;
};
```
