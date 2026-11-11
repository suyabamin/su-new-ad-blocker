# Filter List Sources

All sources must be listed here before they are used in the build script or dynamic updater.

## EasyList

- **URL:** https://easylist.to/easylist/easylist.txt
- **Mirror:** https://raw.githubusercontent.com/easylist/easylist/master/easylist/easylist.txt
- **License:** GNU General Public License v3.0 (GPL-3.0)
- **License URL:** https://github.com/easylist/easylist/blob/master/COPYING
- **Purpose:** Primary ad blocking — blocks advertisement URLs
- **Update frequency:** Daily
- **Maintainer:** EasyList Authors (https://easylist.to/)

## EasyPrivacy

- **URL:** https://easylist.to/easylist/easyprivacy.txt
- **Mirror:** https://raw.githubusercontent.com/easylist/easylist/master/easylist/easyprivacy.txt
- **License:** GNU General Public License v3.0 (GPL-3.0)
- **License URL:** https://github.com/easylist/easylist/blob/master/COPYING
- **Purpose:** Tracker blocking — blocks analytics, tracking pixels, and telemetry URLs
- **Update frequency:** Daily
- **Maintainer:** EasyList Authors (https://easylist.to/)

---

## License Compliance Notes

- EasyList and EasyPrivacy are GPL-3.0 licensed. Bundling a **converted subset** of these lists as a DNR JSON ruleset is permitted under GPL-3.0 (the converted data is a derivative work; this extension is also open-source or the user must comply with GPL-3.0 terms).
- The raw `.txt` filter list files are **not committed** to this repository. They are downloaded at build time only.
- If additional filter lists are added in the future, they must be recorded in this file before use, with their license verified.
