import Logger, { ILoggerOptions, LogLevel } from "@jscriptlogger/lib";
import Client from "./Client";
import {
  AddPageLine,
  LineType,
  lineTypeError,
  lineTypeLog,
} from "@jscriptlogger/schema/src/app/page";
import convert from "@jscriptlogger/schema/converter";
import { objectId } from "@jscriptlogger/schema/src/app/objectId";

export default class LoggerNetwork extends Logger {
  readonly #client;
  #pageId: Promise<objectId | null>;
  #pending = Promise.resolve();
  public constructor(
    name: string | string[],
    options: ILoggerOptions & {
      pageId: Promise<objectId | null>;
      client: Client;
      logLevel?: LogLevel;
    }
  ) {
    super(name, options);
    this.#client = options.client;
    this.#pageId = options.pageId;
  }
  public override log(...args: unknown[]) {
    this.#store(lineTypeLog(), args);
    super.log(...args);
  }
  public override error(...args: unknown[]) {
    this.#store(lineTypeError(), args);
    super.error(...args);
  }
  #store(lineType: LineType, args: unknown[]) {
    this.#pending = this.#pending.then(async () => {
      const pageId = await this.#pageId;
      if (pageId === null) {
        super.error("no page id available, failed to proceed");
        return;
      }
      const result = await this.#client.sendMessage(
        AddPageLine({
          line: args.map((a) => convert(a)),
          pageId,
          lineType,
        })
      );
      if (result._name !== "app.page.addPageLineResult") {
        super.error("failed to store line with error: %o", result);
      } else {
        super.log(result);
      }
    });
  }
}
