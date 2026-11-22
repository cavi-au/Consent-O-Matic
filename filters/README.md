# Cookie filter list

`cookie-notices.txt` is the **AdGuard Cookie Notices** filter list
(<https://github.com/AdguardTeam/AdGuardFilters>). It is distributed under AdGuard's licence
(GPL-3.0, see <https://github.com/AdguardTeam/AdguardFilters/blob/master/LICENSE>), not the MIT licence
that covers the rest of this repository.

At build time, `parse-cookie-filters.cjs` keeps only the element-hiding rules (`##`, `#@#`) and writes
them to `build/cookie-filters.json`. Consent-O-Manual uses them to **detect** cookie banners that no rule
in `rules/` or `rules-plus/` covers. Network rules, scriptlets, CSS injection and extended-CSS rules are
ignored.

To update the list, replace `cookie-notices.txt` with a newer copy and rebuild.
