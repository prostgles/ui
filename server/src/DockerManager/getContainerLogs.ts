import { executeDockerCommand } from "./executeDockerCommand";

export const getContainerLogs = async (containerId: string) => {
  const result = await executeDockerCommand(
    [
      "logs",
      // "--timestamps",
      "--details",
      // "--tail",
      // "all",
      containerId,
    ],
    { timeout: 5000 },
  );

  return result;
  //     const args = ["logs"];

  //     if (options.tail) {
  //       args.push("--tail", options.tail.toString());
  //     }

  //     if (options.since) {
  //       args.push("--since", options.since);
  //     }

  //     args.push(this.containerId);

  //     const result = await this.executeDockerCommand(args);
  //     return result.stdout;
};

// export const collectContainerLogs = async (containerId: string) => {
//   const result = await executeDockerCommand([
//     "logs",
//     "--follow",
//     "--timestamps",
//     containerId,
//   ]);

//   return result;
// };
