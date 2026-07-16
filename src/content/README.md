# Content guide

Photography projects live in `photography/`, with one Markdown file per project. The filename is
the permanent public URL slug, so do not rename a published file without adding a redirect.

Project metadata is validated during `pnpm check` and `pnpm build`. Use `status: draft` for work
that should not appear on the public site yet, and `status: hidden` for an existing project that
should remain available to the build but be excluded from navigation.

Image paths currently point to the legacy `/media/` location. They will become optimized local
image references during the image-pipeline migration stage.
