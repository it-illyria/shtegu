declare module "fit-file-parser" {
  interface FitRecord {
    position_lat?: number;
    position_long?: number;
    [key: string]: unknown;
  }
  interface FitData {
    records?: FitRecord[];
    [key: string]: unknown;
  }
  interface FitParserOptions {
    force?: boolean;
    speedUnit?: string;
    lengthUnit?: string;
    temperatureUnit?: string;
    elapsedRecordField?: boolean;
    mode?: "cascade" | "list" | "both";
  }
  class FitParser {
    constructor(options?: FitParserOptions);
    parse(
      content: ArrayBuffer | Buffer,
      callback: (error: Error | null, data: FitData) => void
    ): void;
  }
  export default FitParser;
}
