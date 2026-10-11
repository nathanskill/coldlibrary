# Held: Chinese translations of RFC 2324 (S-007019) and RFC 2468 (S-007020)

Held on 2026-10-11 by the librarian (Claude) during the translation pass. The two works stay on the computing shelf; only their Chinese translations are held here.

Why they are held:
- Both works are marked `verbatim_only`, and the design spec (§5.3.3) and `tools/stacks-check.mjs` now say that `verbatim_only` works never offer a translation.
- The site credits every translation by Claude as CC0 1.0. These two are derivative works of RFCs still under the Internet Society's 1998 copyright, so a plain CC0 credit would be wrong for them.

They are lawful translations. The Internet Society's Full Copyright Statement (1998) says the document "and translations of it may be copied and furnished to others", provided the copyright notice and the permission paragraph are kept. It allows changes to the document only "as required to translate it into languages other than English". Both files are complete, mirror the originals section by section and paragraph by paragraph, and keep the full notice in English beside the Chinese.

To reshelve them:
1. Decide that these two RFCs are not `verbatim_only` in the site's sense, because their licence allows translation. Set `rights.verbatim_only` to false and keep `rights.notice`.
2. Make sure the page and the `.txt` copy credit the translation with the Internet Society's notice, not CC0 1.0 alone.
3. Move each file back as `translation.zh.md` in its work folder, set `"translations": { "zh": "Claude" }`, and restore the sentence about the translation in `rights.basis` and `note`.
