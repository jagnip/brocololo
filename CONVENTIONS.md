
##  Comments

- No comments explaining what code does
- No comments referencing issues ("// This fixes X", "// Added for Y")
- Only comment when logic is truly non-obvious and can't be clarified through naming

## FIles

- `/app/*` files **MUST** follow NextJS conventions
- All file names **MUST** be written in Kebab Case, example: `my-component.tsx`, `use-this-hook.ts`
- Component names **MUST** be pascal cased, example: `export function MyComponent`
- Non-component function names **MUST** be camel cased, example: `export function useThisHook`
- A component file **MAY** have multiple components inside **UNLESS** they are complex enough
- A component file **MAY** contain component specific types, utils inside **UNLESS** they are complex enough or reusable
- Components **MUST** be functions, example: `export function MyComponent`
- Components, utils etc. **MUST** use _"named exports"_. No _"default"_ ones. Only Next.js files can break this rule.
- Important or large single-purpose functions **SHOULD** have their own file. Shareable smaller utility functions **MAY** live in a `utils.ts` file.
- **MUST** NOT have index files, duplicate folder name if necessary, example: `components/header/header.tsx`

## Folders

- `/app/*` folders **MUST** follow NextJS conventions
- `/app/` folder **MUST** contain only NextJS framework files and components used in its own specific page
- `/app/` folder **MAY** contain private folders like `_components` for better files organization of private route files
- `src/components` **MUST** only contain reusable components across many different pages
- **MUST** follow the file naming convention
- Structure **MUST** be flat most of the times and nested only when it makes sense to gather things together, example:
  - `_components/header.tsx`
  - `_components/route-specific-component.tsx`
  - `_components/table/table-container.tsx`
  - `_components/table/table-item.tsx`
  - `_actions/get-projects.ts`
  - `src/ui/dialog.tsx`
  - `src/components/form-fields/text-field.tsx`
  - `src/components/form-fields/text-area-field.tsx`
  - `src/components/form-fields/use-field.ts`

## Functions

- Return types **MUST** be explicitly typed on all functions where possible.
- All function parameters **MUST** use object destructuring, even for a single parameter (all are named parameters).

  ```ts
  // Avoid
  function createUser(name: string, age: number, role: string): User { ... }
  function getUserById(userId: string): Promise<User> { ... }

  // Required
  function createUser({ name, age, role }: { name: string; age: number; role: string }): User { ... }
  function getUserById({ userId }: { userId: string }): Promise<User> { ... }
  ```

- Transformation functions **MUST** follow the naming convention `<verb><PreviousState>To<NewState>`, e.g., `mapProfileToInterlock`, `convertDraftToLive`.
- Hooks **MUST** have unique names, unless directly wrapping or extending a library hook at the root level.
- Important or large functions **SHOULD** live in their own file, while the rest **SHOULD** live in a `utils.ts` file.
-  No duplicate code — import similar functions or consolidate duplicates if context is similar
* No re-exports — import directly from the source file

## HTTP requests

- At the `src/api` folder, this folder will contain all your API-related code and wrappers.

```
- src
  - api
    - users.ts
    - posts.ts
  - ...
```

## Response payloads

- We should keep and use the API facades `snake_case` values.
- When communicating with the API we should use `snake_case` on the request body.

### Create API wrappers inside the api folder

Inside the api folder, you can create individual wrapper functions for different API endpoints or resources. Each wrapper function should use the baseFetch function to make the actual HTTP request. Add the error handling required at this level to avoid spread error handling at component level.

For example, let's create a wrapper for user-related API requests:

```ts
// api/users.ts
import { API_BASE_URL } from "@/lib/env"

import { baseFetch } from "./base-fetch"

type User = {
  id: string
  name: string
  email: string
}

type CreateUserPayload = {
  name: string
  email: string
}

export function getUsers(): Promise<User[]> {
  return baseFetch<User[]>(API_BASE_URL)
}

export function getUserById(userId: string): Promise<User> {
  const url = `${API_BASE_URL}/${userId}`
  return baseFetch<User>(url)
}

export function createUser(userData: CreateUserPayload): Promise<User> {
  return baseFetch<User>(API_BASE_URL, {
    method: "POST",
    body: JSON.stringify(userData),
  })
}
```

### Request api data from client side component

Create a route handler on api folder as:

```ts
// src/app/api/path/[variable]/route.ts
import { NextResponse } from "next/server"

import { API_BASE_URL } from "@/lib/env"

import { baseFetch } from "@/api/base-fetch"

type TemplateByIdResponse = {
  id: string
  name: string
}

export async function GET(
  request: Request,
  { params }: { params: { variable: string } }
): Promise<NextResponse<TemplateByIdResponse>> {
  const { variable } = params
  const url = `${API_BASE_URL}/use/path/here/${variable}`
  const response = await baseFetch<TemplateByIdResponse>(url, {
    headers: request.headers,
    cache: request.cache,
  })
  return NextResponse.json(response)
}
```

### Request types

All the types related with the response should be placed in the request file.

## Tests

- "Write tests, not too many, mostly integration"
- We aim to have the different levels of testing:
  - unit testing
  - view integration testing
  - end to end testing
- Unit and integration tests (non-e2e) **SHOULD** live close to the code they test (co-located). Migration from the root `__test__/` folder happens incrementally — move tests when you need to write or modify them, not as a separate initiative.
- Test helpers and wrappers for unit tests live in `__test__/utils`.
- `tsconfig` and `Dockerfile` ignore `.test.` files.
- Snapshot tests **SHOULD** exist at both page and component level.
- **SHOULD** be named the same as the source file + `".test"` suffix.

| What                  | unit               | view               | e2e                |
| --------------------- | ------------------ | ------------------ | ------------------ |
| reusable components   | :heavy_check_mark: | -                  | -                  |
| complex UI component  | -                  | :heavy_check_mark: | -                  |
| 1+ comp within a page | -                  | :heavy_check_mark: | -                  |
| 1+ page within a flow | -                  | -                  | :heavy_check_mark: |

### Unit Testing

- to be used for reusable components. Some examples of files located under:
  - `src/components`
  - `src/ui`
  - `src/lib`
- mock data
- no dependencies
- `pnpm test`

#### Unit Testing coverage

- `pnpm test-ci`
- Check output in Terminal or in a browser: `test-results/unit/coverage/index.html`
  - It's listed as:
    - Statements
    - Branches
    - Functions
    - Lines
- Thresholds are set in `vitest.config.ts`

### View Integration Testing

#### Components NOT depending on providers/fetch

- when components do NOT depend on fetch & DO not depend on any other provider besides `NextIntlClientProvider`.
- test files to be co-located next to the source file. Some examples:
  - source: `src/app/[locale]/projects/_components/header.tsx`
  - test: `src/app/[locale]/projects/_components/header.test.tsx`
- mock data & no other methods and/or parameters mocked.
- other tests to cover different functionallity. Some tips:
  - use roles to get elements
  - use regex (ignore case) instead of exact text
- use `@testing-library`
- `pnpm test`

#### Components depending on providers/fetch

- when components depend on fetch OR depend on any other provider besides `NextIntlClientProvider`.
- test files to be located under "`__test-view__`" folder.
- to be used for more than one component interacting together or single pages (no switching/navigating across multiple pages). Some examples:

  - if a page:

    - user type: `regular`
    - source: `src/app/[locale]/notifications/page.tsx` with
    - test: `__test-view__/regular-user/app/[locale]/notifications/notifications.page.test.ts`
    - use this pattern inside the test:

    ```
      import { expect, test } from "../../../utils/axe-utils"
      test.describe('Projects Page', () => {
        test('User can filter by account', () => {})
      })
    ```

  - if NOT a page:
    - user type: `regular`
    - source: `src/app/[locale]/...`
    - test: `__test-view__/regular-user/app/[locale]/navigation.test.ts`

- NO mock data & no other methods and/or parameters mocked.

- other tests to cover different functionallity. Some tips:
  - use roles to get elements
  - use regex (ignore case) instead of exact text

### End to end Testing

- to be used for more than one page interacting together (switching/navigating across multiple pages).
- test files to be located under "`__test-e2e__`" folder. Each file should be located within a folder from its domain. (e.g. `projects`, `templates`, `reports`, `reconcilie`, `user`, etc)
- mocking APIs or NOT.
- Some tips:
  - use roles to get elements
  - use regex (ignore case) instead of exact text
  - use page object model
- test files should have a top level `describe` block as follow:
  ```
  test.describe("@[TAG_PLACEHOLDER] - set profiling", () => {...
  ```
  > TAG_PLACEHOLDER: name of the folder where the test is located. This is used to group tests in suites.

## Error Handling

- All `catch` clauses **MUST** capture the error parameter and log it. No swallowed errors.

  ```ts
  // Avoid
  try {
    await fetchData()
  } catch {
    // silently swallowed
  }

  // Required
  try {
    await fetchData()
  } catch (error) {
    logger.error("Failed to fetch data", { error })
  }
  ```

- Route files **MUST NOT** throw generic errors — propagate the actual error from the API.
- Error handling **SHOULD** live in the API layer (`baseFetch`/`appFetch`) to avoid spreading it across components.

## State Management

- Use **Zustand** for state management, replacing React Context for data storage. Replace in-place and keep stores close to where they are used.
- Use **React Query (TanStack Query)** for server data fetching and caching. Centralize query logic in a `/queries` folder.
- Context API **SHOULD** only hold actions and UI state, not API response data.
- Large contexts **SHOULD** be broken into smaller, focused contexts.
- Zustand guidelines:
  - Avoid `useShallow` by default.
  - Unit test stores that have update logic.
  - Disable devtools in production.
- Use `lodash` debounce — do not use custom debounce implementations.

## NPM Packages

- Simple utility methods from packages — copy into `src/lib` folder instead of installing the full package.
- Complex or trusted packages — install after validating: well-maintained, high weekly downloads, trusted source.
- Cherry-pick imports when the library does not support ES6 tree-shaking.

  ```ts
  // Avoid (imports entire library)
  import { debounce } from "lodash"

  // Preferred (tree-shakeable import)
  import debounce from "lodash/debounce"
  ```

## Database

- The schema lives in `src/db/schema.ts` (drizzle). **NEVER** hand-write DDL — edit the schema and run `pnpm db:generate` so the migration file is generated, committed and reviewable in the PR.
- Migrations are immutable. Once a migration has run in any deployed environment, **NEVER** edit it — add a new one.
- Every query **MUST** go through drizzle (parameterized). **NEVER** build SQL by string concatenation.
- Route handlers that read or write our tables **MUST** verify the session's access to the `account_id` involved before querying, and **MUST** return 404 (not 403) when hiding another account's row, so the endpoint cannot be used to probe what exists.
- Values that come from a request body and land in a `jsonb` column **MUST** be size-capped and validated; treat anything read back out of `jsonb` as untrusted (guard before dereferencing).
- Personal data **SHOULD NOT** be stored in our tables. When a column has to reference a person, store the id we already have (e.g. `user_id`) and **NEVER** return it in an API response.
- Rows **MUST** have a retention story before the table ships: either a documented reason to keep them forever, or a cleanup job plus a read-side guard.
- Local development uses mock mode (`pnpm dev:mock`), which is backed by an in-memory store — a database **MUST NOT** be required to run the app locally.

## Server-Side Rendering

- Use Next.js SSR as intended. Avoid adding `"use client"` unnecessarily.
- Non-interactive components **SHOULD** be server-rendered where possible.
- Centralized server-side calls benefit from caching for all users.

## Imports and Exports

- Alias **MUST** be used when going outside the structure
- Components **MUST** be named exported, example: `export function MyComponent`

## Tailwind

* Always follow DESIGN.md guidelines
* UI Components: When working with individual UI components, use the base spacing provided by Tailwind CSS. This implies that default Tailwind spacing classes like mt-2, px-4, etc., will still be used for styling individual UI elements.
* Integration of Multiple Components: For situations where multiple components need to be integrated or laid out together, use spacing tokens. This approach helps maintain consistent spacing between components across the project.
* Avoid arbitrary values this reduce the maintainability and increase the complexity to make a bulk change

```js
//Avoid
"h-[20px]"
//Use
"h-5"
```

* For those cases where the design do not match with the exact size tailwind provide, use the closest option.
* To high values(>400) where Tailwind do not provide any option create your own value, following the numeric sequence

```js
// tailwind.config.js

...
    extend: {
      minHeight: {
        100: '400px'
      },
...
```



