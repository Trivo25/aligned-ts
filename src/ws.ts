import WebSocket from "ws";
import { ProtocolVersion, VerificationDataCommitment } from "./types.js";
import assert from "assert";
import { Constants } from "./constants.js";

export { openWebSocket };

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
