import { useTypedSearchParams } from "src/hooks/useTypedSearchParams";

export const useWebAppConfigActiveSection = () => {
  const [{ web_config_section: section = "Preview" }, setParams, lastChanged] =
    useTypedSearchParams({
      web_config_section: {
        optional: true,
        enum: ["Preview", "Components", "Files", "Tests"],
      },
    } as const);
  return { section, setParams, lastChanged };
};
