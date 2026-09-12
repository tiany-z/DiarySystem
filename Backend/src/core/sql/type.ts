export type NonEmptyString = string & `${string & {}}`;

export type valueType =
  | "Auto"
  | "number"
  | "string"
  | "boolean"
  | "date"
  | "null";

export type operator =
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "LIKE"
  | "NOT LIKE"
  | "ILIKE"
  | "NOT ILIKE"
  | "SIMILAR TO"
  | "NOT SIMILAR TO"
  | "REGEXP"
  | "NOT REGEXP"
  | "IN"
  | "NOT IN"
  | "BETWEEN"
  | "NOT BETWEEN"
  | "IS NULL"
  | "IS NOT NULL"
  | "IS"
  | "IS NOT";

export type whereLogicalOperator = "AND" | "OR" | "NOT";
export type functionWrapper = `${string}?${string}`;

/** select.column 返回值类型 */
export interface ColumnNode {
  _type: "column";
  tableNode: TableNode;
  column: NonEmptyString;
  as?: NonEmptyString;
  functionWrapper?: functionWrapper;
}

/** from.table 返回值类型 (适配 MySQL: schema 可选，若为 public 或空则忽略) */
export interface TableNode {
  _type: "table";
  schema?: string;
  table: NonEmptyString;
  as?: NonEmptyString;
}

/** customValue 返回值类型 */
export interface CustomValueNode {
  _type: "customValue";
  string: string;
}

/** where.compare 返回值类型 */
export interface WhereCompareNode {
  _type: "whereCompareNode";
  column: ColumnNode | CustomValueNode;
  operator: operator;
  compareColumn?: ColumnNode | CustomValueNode;
}

/** where.logicalLink 返回值类型 */
export interface WhereLogicalLinkNode {
  _type: "whereLogicalLinkNode";
  operator: whereLogicalOperator;
}

/** where.group 返回值类型 */
export interface WhereGroupNode {
  _type: "whereGroupNode";
  children: Array<WhereCompareNode | WhereLogicalLinkNode | WhereGroupNode>;
}

export type WhereConditionNode =
  | WhereCompareNode
  | WhereLogicalLinkNode
  | WhereGroupNode;

/** orderBy.ASC/DESC 返回值类型 */
export interface OrderByNode {
  _type: "orderBy";
  column: ColumnNode;
  direction: "ASC" | "DESC";
}

/** limit 节点类型 */
export type LimitSubType = "indexSize" | "pageSize";

export interface LimitNode {
  _type: "limit";
  _limitType: LimitSubType;
  startIndex?: number;
  size: number;
  page?: number;
}

export interface NeedInputValue {
  currentSQL: NonEmptyString;
}

export interface ParseColumnsResult {
  columnsSQL: string;
  tablesSQL: string;
}

export interface ParseOrderByResult {
  orderBySQL: string;
}

export interface ParseLimitResult {
  limitSQL: string;
}

export interface ParseWhereResult {
  whereSQL: string;
  needInputValues: Array<NeedInputValue>;
}

export interface SelectCompose {
  allColumns?: boolean;
  columns: Array<ColumnNode>;
  where?: Array<WhereConditionNode>;
  orderBy?: Array<OrderByNode>;
  limit?: LimitNode;
  distinct?: boolean;
}

export interface SelectBuildResult {
  tableName: string;
  sql: string;
  sqlOnlyId: string;
  needInputValues: Array<NeedInputValue>;
}

export interface UndoOperation {
  undoSql: string;
  undoParams: any[];
}

export interface InsertCompose {
  table?: TableNode;
  columns: Array<ColumnNode>;
  idType?: "uuid" | "auto_increment" | "manual";
}

export interface InsertBuildResult {
  tableName: string;
  sql: string;
  autoInjectedId?: boolean;
  needInputValues: Array<{ columnName: string }>;
  createUndoFn: (insertedId: string | number) => UndoOperation;
}

export interface UpdateCompose {
  table: TableNode;
  targetId: string | number;
  updateData: Record<string, any>;
}

export interface UpdateBuildResult {
  tableName: string;
  targetId: string | number;
  lockSql: string;
  updateSql: string;
  updateParams: any[];
  createUndoFn: (oldRowSnapshot: Record<string, any>) => UndoOperation;
}

export interface DeleteCompose {
  table: TableNode;
  targetId: string | number;
}

export interface DeleteBuildResult {
  tableName: string;
  targetId: string | number;
  lockSql: string;
  deleteSql: string;
  deleteParams: any[];
  createUndoFn: (deletedRowSnapshot: Record<string, any>) => UndoOperation;
}
