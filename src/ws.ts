import WebSocket from "ws";
import { ProtocolVersion, VerificationDataCommitment } from "./types.js";
import assert from "assert";
import { Constants } from "./constants.js";

export { openWebSocket };

const openWebSocket = (address: string): Promise<WebSocket> => {
  return new Promise(function (resolve, reject) {
    const ws = new WebSocket(address);
    ws.onopen = () => {
      resolve(ws);
    };
    ws.onmessage = (event: WebSocket.MessageEvent) => {
      console.log(event.data);
      //assert(event.data instanceof Buffer, "Protocol currently not supported");
      console.log("connected2222222222");
      /*      const expectedProtocolVersion = ProtocolVersion.fromBytesBuffer(
        event.data
      );
      assert(
        Constants.ProtocolVersion === expectedProtocolVersion,
        `Unsupported Protocol version. Supported ${Constants.ProtocolVersion} but got ${expectedProtocolVersion}`
      );
*/
      resolve(ws);
    };
    ws.onerror = (data: WebSocket.ErrorEvent) => {
      console.log("error");
      reject(
        `Cannot connect to ${address}, received error ${data.error} - ${data.message}`
      );
    };
    ws.onclose = (event: WebSocket.CloseEvent) => {
      console.log("closed", event.reason);
    };
  });
};
