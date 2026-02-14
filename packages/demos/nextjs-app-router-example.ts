/**
 * Example: Next.js App Router PWA Support
 *
 * This example demonstrates how Universal PWA handles Next.js projects
 * with the App Router (Next.js 13+) where src/app/layout.tsx is used.
 *
 * Before running command:
 * - Your Next.js project has src/app/layout.tsx or app/layout.tsx
 * - Your project has next in package.json
 *
 * Command:
 * ```bash
 * universal-pwa init --project-path /path/to/nextjs/app
 * ```
 *
 * What happens:
 * 1. Scans your project and detects Next.js with App Router
 * 2. Generates manifest.json in public/
 * 3. Generates PWA icons in public/icons/
 * 4. Injects manifest reference into src/app/layout.tsx metadata export
 * 5. Generates service worker in public/sw.js
 */

// Example: Initial layout.tsx structure
const exampleBefore = `import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.scss';
import { RouteGuard } from '@/app/guard';
import 'uikit/index.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Daiive - Plus qu\\'un ERP, un assistant pour les pros',
  description: 'Enhance your business with Daiive',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={\`\${geistSans.variable} \${geistMono.variable} antialiased\`}
        suppressHydrationWarning
      >
        <RouteGuard >
          {children}
        </RouteGuard>
      </body>
    </html>
  );
}`;

// Example: After running universal-pwa init
const exampleAfter = `import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.scss';
import { RouteGuard } from '@/app/guard';
import 'uikit/index.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Daiive - Plus qu\\'un ERP, un assistant pour les pros',
  description: 'Enhance your business with Daiive',
  manifest: '/manifest.json',  // <- AUTOMATICALLY INJECTED
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={\`\${geistSans.variable} \${geistMono.variable} antialiased\`}
        suppressHydrationWarning
      >
        <RouteGuard >
          {children}
        </RouteGuard>
      </body>
    </html>
  );
}`;

/**
 * Key Features Added:
 *
 * 1. Automatic Detection of Next.js App Router
 *    - Checks for 'next' in package.json dependencies
 *    - Checks for app/layout.tsx or src/app/layout.tsx files
 *
 * 2. Intelligent Metadata Injection
 *    - Finds existing Metadata export
 *    - Adds manifest property without overwriting other properties
 *    - Creates Metadata export if missing
 *    - Adds Metadata import if missing
 *
 * 3. Safe and Non-Destructive
 *    - Can be run multiple times (skips if already present)
 *    - All changes are transactional (rollback on error)
 *    - Respects existing configurations
 *
 * 4. Support for basePath
 *    - Works with applications deployed under a subpath
 *    - Example: manifest: '/myapp/manifest.json'
 *
 * 5. Handles Multiple Layouts
 *    - Injects metadata in all layout.{ts,tsx} files found
 *    - Supports route groups and nested layouts
 */

/**
 * Programmatic Usage Example:
 */
import { injectNextJsMetadataInFile } from "@julien-lin/universal-pwa-core";

const result = injectNextJsMetadataInFile("src/app/layout.tsx", {
  manifestPath: "/manifest.json",
  basePath: "/myapp",
  themeColor: "#ff6600",
  backgroundColor: "#ffffff",
});

console.log("Injected:", result.injected);
// Output: [ "manifest: '/myapp/manifest.json'" ]

console.log("Modified:", result.modified);
// Output: true

console.log("Warnings:", result.warnings);
// Output: []

/**
 * Edge Cases Handled:
 *
 * 1. Missing Metadata Import
 *    - Automatically adds: import type { Metadata } from 'next'
 *
 * 2. Complex Metadata Objects
 *    - Works with nested properties, icons, theme colors, etc.
 *    - Preserves all existing configuration
 *
 * 3. Multiple Layouts in Route Groups
 *    - app/layout.tsx              (root)
 *    - app/(auth)/layout.tsx       (auth group)
 *    - app/dashboard/layout.tsx    (nested)
 *    All are updated automatically
 *
 * 4. Already Configured Projects
 *    - If manifest is already present, injection is skipped
 *    - No duplicate manifest properties
 *
 * 5. File I/O Errors
 *    - Gracefully handles file not found
 *    - Returns warnings instead of failing
 */

/**
 * Files Generated/Modified:
 *
 * Generated:
 * - public/manifest.json
 * - public/manifest.webmanifest (alternative format)
 * - public/sw.js (service worker)
 * - public/icons/* (192x192.png, 512x512.png, etc.)
 * - public/apple-touch-icon.png (iOS support)
 *
 * Modified:
 * - src/app/layout.tsx (metadata injection)
 * - app/layout.tsx (if src/ is not used)
 * - Other layout.tsx files if they have Metadata export
 *
 * If HTML files exist (legacy setup):
 * - Service worker registration injected in HTML files
 * - Meta tags injected in <head>
 */

export const documentation = {
  title: "Next.js App Router PWA Support",
  before: exampleBefore,
  after: exampleAfter,
};
