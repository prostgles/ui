import type { documentsServiceInputSchema } from "@common/mcp/documentsServiceInputSchema";
import type { ServiceManager } from "@src/ServiceManager/ServiceManager";
import { CONVERT_DOCUMENT_DEFAULT_OPTIONS } from "@src/ServiceManager/services/documents/documents.service";
import type { JSONB } from "prostgles-types";

export const getDocumentText = async (
  serviceManager: ServiceManager,
  url: string,
  otherOpts: Partial<JSONB.GetType<typeof documentsServiceInputSchema>>,
) => {
  const docsService = await serviceManager.getServiceWithRetries("documents");
  const result = await docsService.endpoints["/v1/convert/source"]({
    sources: [{ kind: "http", url }],
    options: {
      ...CONVERT_DOCUMENT_DEFAULT_OPTIONS,
      ...otherOpts,
    },
  });
  const {
    text_content,
    doctags_content,
    html_content,
    json_content,
    md_content,
  } = result.document;
  return String(
    text_content ||
      md_content ||
      html_content ||
      doctags_content ||
      JSON.stringify(json_content) ||
      "",
  );
};
