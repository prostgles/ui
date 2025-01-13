// import { useEffect, useState } from "react";

// import type {
//   TextClassificationPipeline,
//   TaskType,
// } from "@xenova/transformers";

// type P = {};

// const MODELS = [{ key: "Xenova/Qwen1.5-0.5B-Chat" }];

// const TASKS = [
//   {
//     key: "text-classification",
//   },
//   {
//     key: "text-classification",
//   },
// ] as const;

// export const useLocalLLM = (props: P) => {
//   const [enabled, setEnabled] = useState(true);
//   //       "text-generation",
//   //       "Qwen/Qwen2.5-Coder-7B-Instruct",
//   const [model, setModel] = useState("Qwen/Qwen2.5-Coder-7B-Instruct");
//   const [task, setTask] = useState<TaskType | undefined>("text-classification");
//   const [pipeObj, setPipe] = useState<
//     { pipe: TextClassificationPipeline } | undefined
//   >();

//   useEffect(() => {
//     const setupPipe = async () => {
//       if (!enabled || !model || !task) return;
//       const { pipeline, env } = await import(
//         /* webpackChunkName: "@xenova/transformers" */ "@xenova/transformers"
//       );
//       env.allowLocalModels = false;
//       env.useBrowserCache = false;
//       const pipe = (await pipeline(task, model, {
//         progress_callback: console.log,
//       })) as TextClassificationPipeline;
//       setPipe({ pipe });
//     };
//     setupPipe();
//   }, [enabled, model, task]);

//   useEffect(() => {
//     const getResponse = async () => {
//       if (!pipeObj) return;
//       const out = await pipeObj.pipe("I love transformers!");
//       console.log(out);
//     };
//     getResponse();
//   }, [pipeObj]);
// };

// // async function runQwen() {
// //   try {
// //     // Allocate a pipeline for sentiment-analysis
// //     const pipe = await pipeline("sentiment-analysis");

// //     const out = await pipe("I love transformers!");
// //     console.log(out);
// //     // Initialize the model
// //     const generator = await pipeline(
// //       "text-generation",
// //       "Qwen/Qwen2.5-Coder-7B-Instruct",
// //     );

// //     // Generate text
// //     const result = await generator(
// //       "Write a function to calculate fibonacci numbers:",
// //       {
// //         max_new_tokens: 128,
// //         temperature: 0.7,
// //       },
// //     );

// //     console.log(result[0]);
// //   } catch (error) {
// //     console.error("Error:", error);
// //   }
// // }
// // runQwen();
