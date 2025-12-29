// import { https } from "firebase-functions/v2";
// import { Request, Response } from "express";

// let handler: any = null;

// export const nextjsHandler = https.onRequest(
//   { memory: "1GiB", timeoutSeconds: 60 },
//   async (req: Request, res: Response) => {
//     if (!handler) {
//       const next = await import("next");
//       const app = (next as any).default({
//         dev: process.env.NODE_ENV !== "production",
//         dir: "../",
//       });
//       await app.prepare();
//       handler = app.getRequestHandler();
//     }

//     return handler(req, res);
//   }
// );
