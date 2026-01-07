# DESI Charts

An extension of D3 to create complex graphs of weather data.

## Getting Started

This is a monorepo setup using NPM Workspaces. The `/library` directory contains the `desi-charts` package and the `/demo` directory contains the examples, which can be run with [Vite](https://vitejs.dev/).

### To install dependencies:

_**Note:** Following commands are all from the root directory_

1. Install `npm` packages

    ```bash
    npm install
    ```

2. Build the `desi-charts` package

    ```bash
    npm run build
    ```

    - This only needs to be done once after cloning the repo. But if any changes are made to files in `/library` that need to be reflected in the demo project, a new build must be created. Alternatively, run the command below to automatically build after every file change/save.

    ```bash
    npm run build:dev
    ```

### To run the Vite dev server with examples:

```bash
# root directory or /demo
npm run dev
```
