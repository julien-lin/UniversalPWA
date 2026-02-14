import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import {
  injectNextJsMetadata,
  injectNextJsMetadataInFile,
  isNextJsLayoutFile,
} from "./nextjs-metadata-injector.js";
import { createTestDir, cleanupTestDir } from "../__tests__/test-helpers.js";

describe("nextjs-metadata-injector", () => {
  let TEST_DIR: string;

  beforeEach(() => {
    TEST_DIR = createTestDir("nextjs-metadata-injector");
  });

  afterEach(() => {
    cleanupTestDir(TEST_DIR);
  });

  describe("isNextJsLayoutFile", () => {
    it("should identify layout.tsx as Next.js layout file", () => {
      expect(isNextJsLayoutFile("app/layout.tsx")).toBe(true);
    });

    it("should identify layout.ts as Next.js layout file", () => {
      expect(isNextJsLayoutFile("src/app/layout.ts")).toBe(true);
    });

    it("should not identify other files as layout files", () => {
      expect(isNextJsLayoutFile("app/page.tsx")).toBe(false);
      expect(isNextJsLayoutFile("index.html")).toBe(false);
      expect(isNextJsLayoutFile("layout.txt")).toBe(false);
    });
  });

  describe("injectNextJsMetadata", () => {
    const basicLayout = `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My App',
  description: 'Test app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`;

    it("should inject manifest into existing metadata", () => {
      const result = injectNextJsMetadata("app/layout.tsx", basicLayout, {
        manifestPath: "/manifest.json",
      });

      expect(result.modified).toBe(true);
      expect(result.injected).toContain(`manifest: '/manifest.json'`);
      expect(result.content).toContain("manifest: '/manifest.json'");
      expect(result.content).toContain("title");
      expect(result.content).toContain("description");
    });

    it("should handle basePath in manifest path", () => {
      const result = injectNextJsMetadata("app/layout.tsx", basicLayout, {
        manifestPath: "manifest.json",
        basePath: "/app/",
      });

      expect(result.modified).toBe(true);
      expect(result.content).toContain("manifest: '/app/manifest.json'");
    });

    it("should not inject if manifest already exists", () => {
      const layoutWithManifest = `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My App',
  manifest: '/existing-manifest.json',
};`;

      const result = injectNextJsMetadata(
        "app/layout.tsx",
        layoutWithManifest,
        {
          manifestPath: "/manifest.json",
        },
      );

      expect(result.modified).toBe(false);
      expect(result.skipped).toContain("manifest property already exists");
    });

    it("should add Metadata import if missing", () => {
      const layoutWithoutImport = `export const metadata: Metadata = {
  title: 'My App',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <html><body>{children}</body></html>;
}`;

      const result = injectNextJsMetadata(
        "app/layout.tsx",
        layoutWithoutImport,
        {
          manifestPath: "/manifest.json",
        },
      );

      expect(result.modified).toBe(true);
      expect(result.content).toContain("import type { Metadata } from 'next'");
      expect(result.content).toContain("manifest: '/manifest.json'");
    });

    it("should create metadata export if not found", () => {
      const layoutWithoutMetadata = `import type { Metadata } from 'next';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`;

      const result = injectNextJsMetadata(
        "app/layout.tsx",
        layoutWithoutMetadata,
        {
          manifestPath: "/manifest.json",
        },
      );

      expect(result.modified).toBe(true);
      expect(result.content).toContain("export const metadata: Metadata");
      expect(result.content).toContain("manifest: '/manifest.json'");
    });

    it("should handle non-layout files gracefully", () => {
      const result = injectNextJsMetadata("app/page.tsx", basicLayout, {
        manifestPath: "/manifest.json",
      });

      expect(result.modified).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("injectNextJsMetadataInFile", () => {
    const basicLayout = `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My App',
  description: 'Test app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`;

    it("should inject manifest into file and write changes", () => {
      const layoutFile = join(TEST_DIR, "layout.tsx");
      writeFileSync(layoutFile, basicLayout, "utf-8");

      const result = injectNextJsMetadataInFile(layoutFile, {
        manifestPath: "/manifest.json",
      });

      expect(result.modified).toBe(true);
      expect(result.injected).toBeTruthy();

      const modifiedContent = readFileSync(layoutFile, "utf-8");
      expect(modifiedContent).toContain("manifest: '/manifest.json'");
    });

    it("should handle file I/O errors gracefully", () => {
      const nonExistentFile = join(TEST_DIR, "non-existent.tsx");

      const result = injectNextJsMetadataInFile(nonExistentFile, {
        manifestPath: "/manifest.json",
      });

      expect(result.modified).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("Error processing file");
    });

    it("should not overwrite file if injection fails", () => {
      const layoutFile = join(TEST_DIR, "layout.tsx");
      writeFileSync(layoutFile, basicLayout, "utf-8");

      const result = injectNextJsMetadataInFile(layoutFile, {});

      expect(result.modified).toBe(false);
      const content = readFileSync(layoutFile, "utf-8");
      expect(content).toBe(basicLayout);
    });
  });

  describe("Edge cases", () => {
    it("should handle metadata with multiple properties", () => {
      const complexMetadata = `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My App',
  description: 'Test app',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  themeColor: '#000000',
};`;

      const result = injectNextJsMetadata("app/layout.tsx", complexMetadata, {
        manifestPath: "/manifest.json",
      });

      expect(result.modified).toBe(true);
      expect(result.content).toContain("manifest: '/manifest.json'");
      expect(result.content).toContain("themeColor");
      expect(result.content).toContain("icons");
    });

    it("should handle basePath with trailing slash", () => {
      const basicLayout = `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My App',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <html><body>{children}</body></html>;
}`;

      const result = injectNextJsMetadata("app/layout.tsx", basicLayout, {
        manifestPath: "manifest.json",
        basePath: "/myapp/",
      });

      expect(result.modified).toBe(true);
      expect(result.content).toContain("manifest: '/myapp/manifest.json'");
    });

    it("should handle basePath without leading slash", () => {
      const basicLayout = `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My App',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <html><body>{children}</body></html>;
}`;

      const result = injectNextJsMetadata("app/layout.tsx", basicLayout, {
        manifestPath: "/manifest.json",
        basePath: "myapp",
      });

      expect(result.modified).toBe(true);
      expect(result.content).toContain("manifest: '/myapp/manifest.json'");
    });
  });
});
