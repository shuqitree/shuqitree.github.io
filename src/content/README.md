# Content guide

Photography projects live in `photography/`, with one Markdown file per project. The filename is
the permanent public URL slug, so do not rename a published file without adding a redirect.

Project metadata is validated during `pnpm check` and `pnpm build`. Use `status: draft` for work
that should not appear on the public site yet, and `status: hidden` for an existing project that
should remain available to the build but be excluded from navigation.

Images live in `src/assets/media/`. Keep the same folder structure used in frontmatter paths: the
path `/media/example/1.webp` resolves to `src/assets/media/example/1.webp`. Astro creates responsive
WebP variants during the build, while the original is reserved for the lightbox.

To add a project:

1. Make a folder in `src/assets/media/` and add the photographs.
2. Copy an existing Markdown project, rename it to the desired permanent URL slug, and update its
   metadata and text.
3. Start with `status: draft`. Run `pnpm check` and `pnpm dev` to review it locally.
4. Change the status to `published`, then commit and push the source files. GitHub Actions builds
   and publishes the static site after the change reaches `main`.

The `order` field controls navigation and tree order. A cover must also be listed in `images`.
