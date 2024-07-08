import { ethers } from "ethers";
import { Constants } from "./constants.js";
import {
  Aligned,
  AlignedVerificationData,
  BatchInclusionData,
  ClientMessage,
  ProtocolVersion,
  VerificationData,
  VerificationDataCommitment,
} from "./types.js";
import assert from "assert";
import WebSocket from "ws";
import { Keccak } from "sha3";
import { verifyMerklePath } from "./merkle-proof.js";
import { verifyProofOnchain } from "./eth.js";

export { getAligned };

/**
 * Creates an instance of an interaction with Aligned layer.
 * This object will be used to interact with Aligned Layer, sent data for verification and check response.
 * @param address - optional (websocket) address of the batcher
 */
const getAligned = (address?: string): Aligned => {
  let currentInstance = address ?? Constants.DefaultAddress;

  return {
    getDefaultBatcherAddress: () => Constants.DefaultAddress,
    getCurrentBatcherAddress: () => currentInstance,
    setCurrentBatcherAddress: (address: string) => {
      currentInstance = address;
    },
    submit: async (verificationData: VerificationData, wallet: ethers.Wallet) =>
      (await submitMultiple([verificationData], wallet, currentInstance))[0],
    submitMultiple: (
      verificationData: Array<VerificationData>,
      wallet: ethers.Wallet
    ) => submitMultiple(verificationData, wallet, currentInstance),
    getExplorerLink: (batchMerkleRoot: Uint8Array) =>
      `https://explorer.alignedlayer.com/batches/0x${Buffer.from(
        batchMerkleRoot
      ).toString("hex")}`,
    getVerificationKeyCommitment: (vk: Buffer) => {
      const Hash = new Keccak(256);
      return Hash.update(vk).digest("hex");
    },
    verifyProofOnchain,
  };
};

const submitMultiple = async (
  verificationData: Array<VerificationData>,
  wallet: ethers.Wallet,
  instance: string
) => {
  // check protocol version match
  const ws = await openWebSocket(instance);

  assert(verificationData.length !== 0, "Empty list of verification data");

  let sentVerificationData: Array<VerificationData> = [];

  // prepare data to send
  const preparedData = verificationData.map((data) => {
    sentVerificationData.push(data);
    return ClientMessage.from(data, wallet);
  });

  let reverseCommitments = sentVerificationData
    .reverse()
    .map((data) => VerificationDataCommitment.fromData(data));

  // attach receive listener
  const receivePromise = receiveResponse(reverseCommitments.length, ws);

  // send data to batcher
  preparedData.forEach((data) => ws.send(ClientMessage.toString(data)));

  const receivedData = await receivePromise;
  assert(
    receivedData.length === reverseCommitments.length,
    "Received data does not match expected data length"
  );

  const alignedVerificationData: Array<AlignedVerificationData> = [];

  receivedData.forEach((data) => {
    const commitment = reverseCommitments.pop()!;

    if (
      verifyMerklePath(
        data.batchInclusionProof.merkle_path,
        data.batchMerkleRoot,
        data.indexInBatch,
        commitment
      )
    )
      alignedVerificationData.push(
        AlignedVerificationData.from(commitment, data)
      );
  });

  // all data received and set, we should be done here
  ws.close();
  return alignedVerificationData;
};

const receiveResponse = async (
  n: number,
  ws: WebSocket
): Promise<Array<BatchInclusionData>> => {
  return new Promise((resolve, reject) => {
    let includedData: Array<BatchInclusionData> = [];
    let i = 0;
    ws.onmessage = (event: WebSocket.MessageEvent) => {
      if (event.data instanceof Buffer)
        includedData.push(BatchInclusionData.fromBuffer(event.data));
      else throw Error("Data format not supported");
      i++;
      if (i === n) resolve(includedData);
      // TODO: set a timeout, dont let idle forever
    };
    ws.onclose = (event: WebSocket.CloseEvent) => {
      reject("Connection was closed because all data was received");
    };
  });
};

const openWebSocket = (address: string): Promise<WebSocket> => {
  return new Promise(function (resolve, reject) {
    const ws = new WebSocket(address);

    ws.onmessage = (event: WebSocket.MessageEvent) => {
      assert(event.data instanceof Buffer, "Protocol currently not supported");
      const expectedProtocolVersion = ProtocolVersion.fromBytesBuffer(
        event.data
      );
      assert(
        Constants.ProtocolVersion === expectedProtocolVersion,
        `Unsupported Protocol version. Supported ${Constants.ProtocolVersion} but got ${expectedProtocolVersion}`
      );
      resolve(ws);
    };
    ws.onerror = (data: WebSocket.ErrorEvent) => {
      reject(
        `Cannot connect to ${address}, received error ${data.error} - ${data.message}`
      );
    };
    ws.onclose = (event: WebSocket.CloseEvent) => {
      console.error("Closed", event.reason);
    };
  });
};
