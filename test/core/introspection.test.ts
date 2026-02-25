import { expect, test, describe, mock, beforeEach } from "bun:test";
import { IntrospectionEngine } from "../../src/core/introspection";
import { FeishuClient } from "../../src/core/client";

describe("IntrospectionEngine", () => {
  let mockClient: any;
  let engine: IntrospectionEngine;

  beforeEach(() => {
    mockClient = {
      get: mock(),
    };
    engine = new IntrospectionEngine(mockClient as unknown as FeishuClient);
  });

  test("listTables handles pagination", async () => {
    let callCount = 0;
    mockClient.get = mock(async (path: string, query: any) => {
      callCount++;
      if (callCount === 1) {
        expect(path).toBe("/open-apis/bitable/v1/apps/base1/tables");
        expect(query).toEqual({});
        return {
          items: [{ table_id: "t1", name: "Table 1" }],
          has_more: true,
          page_token: "p1",
        };
      }
      expect(path).toBe("/open-apis/bitable/v1/apps/base1/tables");
      expect(query).toEqual({ page_token: "p1" });
      return {
        items: [{ table_id: "t2", name: "Table 2" }],
        has_more: false,
      };
    });

    const tables = await (engine as any).listTables("base1");

    expect(tables).toHaveLength(2);
    expect(tables[0].table_id).toBe("t1");
    expect(tables[1].table_id).toBe("t2");
    expect(callCount).toBe(2);
  });

  test("listFields handles pagination", async () => {
    let callCount = 0;
    mockClient.get = mock(async (path: string, query: any) => {
      callCount++;
      if (callCount === 1) {
        expect(path).toBe("/open-apis/bitable/v1/apps/base1/tables/t1/fields");
        expect(query).toEqual({});
        return {
          items: [{ field_id: "f1", field_name: "Field 1", type: 1 }],
          has_more: true,
          page_token: "p1",
        };
      }
      expect(path).toBe("/open-apis/bitable/v1/apps/base1/tables/t1/fields");
      expect(query).toEqual({ page_token: "p1" });
      return {
        items: [{ field_id: "f2", field_name: "Field 2", type: 1 }],
        has_more: false,
      };
    });

    const fields = await (engine as any).listFields("base1", "t1");

    expect(fields).toHaveLength(2);
    expect(fields[0].field_id).toBe("f1");
    expect(fields[1].field_id).toBe("f2");
    expect(callCount).toBe(2);
  });

  test("introspect returns full schema", async () => {
    mockClient.get = mock(async (path: string) => {
      if (path.includes("/tables") && !path.includes("/fields")) {
        return {
          items: [{ table_id: "t1", name: "Table 1" }],
          has_more: false,
        };
      }
      if (path.includes("/fields")) {
        return {
          items: [{ field_id: "f1", field_name: "Field 1", type: 1 }],
          has_more: false,
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const schema = await engine.introspect("base1");

    expect(schema.baseToken).toBe("base1");
    expect(schema.tables).toHaveLength(1);
    expect(schema.tables[0].id).toBe("t1");
    expect(schema.tables[0].name).toBe("Table 1");
    expect(schema.tables[0].fields).toHaveLength(1);
    expect(schema.tables[0].fields[0].field_id).toBe("f1");
  });
});
