# Load the unpacked extension

## Build the extension

From the project directory, install dependencies and build the extension:

```sh
npm ci
npm run build
```

The build creates the unpacked extension in `dist/`.

## Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Select the project's `dist/` directory.

## Microsoft Edge

1. Open `edge://extensions`.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Select the project's `dist/` directory.

## After rebuilding

Run `npm run build` again. On the extensions page, select the extension's **Reload** button, then
refresh open website tabs so their content scripts use the rebuilt files.

## Read block counts

Open the extension popup to see counts for the current site and today. Open **Options** for
lifetime and daily totals, blocking type breakdowns, and top blocked domains. Counts are based on
requests matching the bundled rules and cosmetic reports; they are not a guarantee that every ad
on a page was blocked.
