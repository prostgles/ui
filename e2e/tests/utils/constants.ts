export enum USERS {
  test_user = "test_user",
  default_user = "default_user",
  default_user1 = "default_user1",
  public_user = "public_user",
  new_user = "new_user",
  new_user1 = "new_user1",
  free_llm_user1 = "free_llm_user1",
}
export const TEST_DB_NAME = "Prostgles UI automated tests database";

export const localNoAuthSetup = !!process.env.PRGL_DEV_ENV;
export const QUERIES = {
  orders: `CREATE TABLE orders ( id SERIAL PRIMARY KEY, user_id UUID NOT NULL, status TEXT );`,
};
