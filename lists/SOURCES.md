# Filter List Sources

Only the following filter data is downloaded. Requests are made from the extension service worker over HTTPS, without credentials, and the response is compiled locally as declarativeNetRequest data. The extension does not execute list contents.

## EasyList

- **URL:** https://easylist.to/easylist/easylist.txt
- **Maintainer:** EasyList authors — https://easylist.to/
- **Purpose:** General advertisement network filters
- **Update cadence:** The source header specifies its current update interval; the extension checks daily.
- **License:** Dual licensed under GNU GPL v3 or later, or Creative Commons Attribution-ShareAlike 3.0 Unported or later.
- **License reference:** https://easylist.to/pages/licence.html
- **Attribution:** EasyList authors (https://easylist.to/)

## EasyPrivacy

- **URL:** https://easylist.to/easylist/easyprivacy.txt
- **Maintainer:** EasyList authors — https://easylist.to/
- **Purpose:** Tracking-system filters
- **Update cadence:** The source header specifies its current update interval; the extension checks daily.
- **License:** Dual licensed under GNU GPL v3 or later, or Creative Commons Attribution-ShareAlike 3.0 Unported or later.
- **License reference:** https://easylist.to/pages/licence.html
- **Attribution:** EasyList authors (https://easylist.to/)

## Conversion and Redistribution

The maintainers' license page states that EasyList and EasyPrivacy are dual licensed under GPL-3.0-or-later or CC-BY-SA-3.0-or-later, and requests attribution. The extension downloads the original text for each user's device and locally converts a supported subset into DNR rules. Raw filter-list snapshots are not bundled or redistributed by this repository. Conversion may omit unsupported syntax and is bounded by the browser's DNR rule quota; this is not full filter-list parity.

Test data in `test-fixture.txt` is solely for tests. The production build compiler reads only files named `production-*.txt`; it excludes the test fixture.

## References

- [EasyList license statement](https://easylist.to/pages/licence.html)
- [EasyList project](https://github.com/easylist/easylist)
- [EasyList current list](https://easylist.to/easylist/easylist.txt)
- [EasyPrivacy current list](https://easylist.to/easylist/easyprivacy.txt)
