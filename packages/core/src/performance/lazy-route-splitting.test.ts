/**
 * Tests for P2.3: Lazy Route Code Splitting
 * @category Performance
 */

import { describe, it, expect } from "vitest";
import {
  analyzeRouteStructure,
  generateSplitStrategy,
  validateRoutes,
  formatLazyRouteAnalysis,
  type RouteDefinition,
} from "./lazy-route-splitting.js";

describe("lazy-route-splitting", () => {
  const createRoute = (
    path: string,
    options: Partial<RouteDefinition> = {},
  ): RouteDefinition => ({
    path,
    lazy: false,
    priority: 50,
    ...options,
  });

  describe("analyzeRouteStructure", () => {
    it("should analyze simple route structure", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { priority: 100, size: 50 * 1024 }),
        createRoute("/about", { lazy: true, size: 30 * 1024 }),
        createRoute("/contact", { lazy: true, size: 25 * 1024 }),
      ];

      const analysis = analyzeRouteStructure(routes);

      expect(analysis.totalRoutes).toBe(3);
      expect(analysis.lazyRoutes).toBe(2);
      expect(analysis.splits).toHaveLength(3);
    });

    it("should handle nested routes", () => {
      const routes: RouteDefinition[] = [
        {
          ...createRoute("/dashboard", { priority: 90, size: 60 * 1024 }),
          children: [
            createRoute("/dashboard/profile", { size: 30 * 1024 }),
            createRoute("/dashboard/settings", { size: 35 * 1024 }),
          ],
        },
      ];

      const analysis = analyzeRouteStructure(routes);

      expect(analysis.totalRoutes).toBe(3);
      expect(analysis.splits).toHaveLength(3);
    });

    it("should detect lazy-loaded routes", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { lazy: false, component: "HomePage" }),
        createRoute("/admin", { lazy: true, component: "lazy(() => import('./Admin'))" }),
        createRoute("/user", { component: "lazy-component" }),
      ];

      const analysis = analyzeRouteStructure(routes);

      expect(analysis.lazyRoutes).toBeGreaterThan(0);
      expect(analysis.splits.some((s) => s.preloadHint === "low" || s.preloadHint === "medium")).toBe(true);
    });

    it("should calculate preload recommendations", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { priority: 100, size: 40 * 1024 }),
        createRoute("/products", { priority: 80, size: 45 * 1024 }),
        createRoute("/admin", { priority: 20, lazy: true, size: 100 * 1024 }),
      ];

      const analysis = analyzeRouteStructure(routes);

      expect(analysis.preloadRecommendations.length).toBeGreaterThan(0);
      expect(
        analysis.preloadRecommendations.some((r) =>
          r.toLowerCase().includes("preload"),
        ),
      ).toBe(true);
    });

    it("should estimate bundle reduction from lazy loading", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { lazy: false, size: 50 * 1024 }),
        createRoute("/admin", { lazy: true, size: 80 * 1024 }),
        createRoute("/api", { lazy: true, size: 60 * 1024 }),
      ];

      const analysis = analyzeRouteStructure(routes);

      expect(analysis.estimatedReduction).toBeGreaterThan(0);
    });

    it("should calculate performance score", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { lazy: false }),
        createRoute("/about", { lazy: true }),
        createRoute("/contact", { lazy: true }),
      ];

      const analysis = analyzeRouteStructure(routes);

      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.score).toBeLessThanOrEqual(100);
    });

    it("should handle empty routes array", () => {
      const analysis = analyzeRouteStructure([]);

      expect(analysis.totalRoutes).toBe(0);
      expect(analysis.lazyRoutes).toBe(0);
      expect(analysis.splits).toHaveLength(0);
      expect(analysis.score).toBeGreaterThanOrEqual(0);
    });

    it("should respect custom configuration", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { size: 50 * 1024 }),
        createRoute("/admin", { size: 100 * 1024 }),
      ];

      const analysis = analyzeRouteStructure(routes, {
        optimalChunkSize: 40 * 1024,
        minBundleSize: 80 * 1024,
      });

      expect(analysis.splits).toBeDefined();
    });

    it("should handle deeply nested routes", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", {
          children: [
            createRoute("/level1", {
              children: [
                createRoute("/level2", {
                  children: [
                    createRoute("/level3", {
                      children: [createRoute("/level4")],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ];

      const analysis = analyzeRouteStructure(routes);

      expect(analysis.totalRoutes).toBeGreaterThan(4);
    });
  });

  describe("generateSplitStrategy", () => {
    it("should generate split strategy for large routes", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { size: 40 * 1024 }),
        createRoute("/admin", { size: 150 * 1024 }),
        createRoute("/products", { size: 120 * 1024 }),
      ];

      const result = generateSplitStrategy(routes);

      expect(result.strategy.splitRoutes).toContain("/admin");
      expect(result.strategy.splitRoutes).toContain("/products");
    });

    it("should recommend preload for high-priority routes", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { priority: 100, size: 40 * 1024 }),
        createRoute("/products", { priority: 90, size: 45 * 1024 }),
        createRoute("/admin", { priority: 20, size: 100 * 1024 }),
      ];

      const result = generateSplitStrategy(routes);

      expect(result.strategy.preloadRoutes.length).toBeGreaterThan(0);
      expect(result.analysis.splits).toBeDefined();
    });

    it("should identify routes for colocating", () => {
      const routes: RouteDefinition[] = [
        createRoute("/dashboard", { size: 40 * 1024 }),
        createRoute("/dashboard/profile", { size: 15 * 1024 }),
        createRoute("/dashboard/settings", { size: 12 * 1024 }),
      ];

      const result = generateSplitStrategy(routes);

      expect(result.strategy.colocateRoutes).toBeDefined();
    });

    it("should return analysis with strategy", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { priority: 100 }),
        createRoute("/about", { lazy: true }),
      ];

      const result = generateSplitStrategy(routes);

      expect(result.analysis.totalRoutes).toBe(2);
      expect(result.analysis.lazyRoutes).toBeGreaterThan(0);
      expect(result.strategy.splitRoutes).toBeDefined();
      expect(result.strategy.preloadRoutes).toBeDefined();
      expect(result.strategy.colocateRoutes).toBeDefined();
    });

    it("should handle aggressive splitting mode", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { size: 80 * 1024 }),
        createRoute("/about", { size: 70 * 1024 }),
      ];

      const result = generateSplitStrategy(routes, { aggressive: true });

      expect(result.strategy).toBeDefined();
      expect(result.analysis.score).toBeGreaterThanOrEqual(0);
    });

    it("should work with custom chunk size", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { size: 40 * 1024 }),
        createRoute("/admin", { size: 60 * 1024 }),
      ];

      const result = generateSplitStrategy(routes, {
        optimalChunkSize: 50 * 1024,
      });

      expect(result.strategy.splitRoutes.length).toBeGreaterThan(0);
    });
  });

  describe("validateRoutes", () => {
    it("should validate correct route structure", () => {
      const routes = [
        { path: "/", component: "Home" },
        { path: "/about", component: "About" },
      ];

      const validated = validateRoutes(routes);

      expect(validated).toHaveLength(2);
      expect(validated[0].path).toBe("/");
    });

    it("should reject invalid route structure", () => {
      const invalidRoutes = [
        { path: "" }, // Empty path
      ];

      expect(() => validateRoutes(invalidRoutes)).toThrow();
    });

    it("should accept optional properties", () => {
      const routes = [
        {
          path: "/",
          lazy: true,
          priority: 50,
          children: [{ path: "/child" }],
        },
      ];

      const validated = validateRoutes(routes);

      expect(validated).toHaveLength(1);
      expect(validated[0].lazy).toBe(true);
      expect(validated[0].children).toHaveLength(1);
    });

    it("should handle nested validation", () => {
      const routes = [
        {
          path: "/",
          children: [
            {
              path: "/child",
              children: [{ path: "/grandchild" }],
            },
          ],
        },
      ];

      const validated = validateRoutes(routes);

      expect(validated[0].children).toBeDefined();
    });

    it("should validate priority range", () => {
      const validRoutes = [{ path: "/", priority: 50 }];
      const validated = validateRoutes(validRoutes);
      expect(validated).toHaveLength(1);
    });
  });

  describe("formatLazyRouteAnalysis", () => {
    it("should format analysis as readable report", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { priority: 100 }),
        createRoute("/admin", { lazy: true, priority: 20 }),
      ];

      const analysis = analyzeRouteStructure(routes);
      const formatted = formatLazyRouteAnalysis(analysis);

      expect(formatted).toContain("Lazy Route Code Splitting Analysis");
      expect(formatted).toContain("Total Routes:");
      expect(formatted).toContain("Lazy Routes:");
      expect(formatted).toContain("Performance Score:");
    });

    it("should include route splits in report", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { size: 40 * 1024 }),
        createRoute("/admin", { lazy: true, size: 80 * 1024 }),
      ];

      const analysis = analyzeRouteStructure(routes);
      const formatted = formatLazyRouteAnalysis(analysis);

      expect(formatted).toContain("Route Splits:");
      expect(formatted).toContain("/");
      expect(formatted).toContain("/admin");
    });

    it("should show preload recommendations when available", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { priority: 100, size: 40 * 1024 }),
        createRoute("/products", { priority: 90, size: 45 * 1024 }),
      ];

      const analysis = analyzeRouteStructure(routes);
      const formatted = formatLazyRouteAnalysis(analysis);

      if (analysis.preloadRecommendations.length > 0) {
        expect(formatted).toContain("Preload Recommendations:");
      }
    });

    it("should display bundle reduction estimate", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { lazy: false, size: 50 * 1024 }),
        createRoute("/admin", { lazy: true, size: 80 * 1024 }),
      ];

      const analysis = analyzeRouteStructure(routes);
      const formatted = formatLazyRouteAnalysis(analysis);

      expect(formatted).toContain("Estimated Bundle Reduction:");
    });

    it("should include priority level for each route", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { priority: 100, size: 40 * 1024 }),
        createRoute("/admin", { priority: 10, size: 50 * 1024 }),
      ];

      const analysis = analyzeRouteStructure(routes);
      const formatted = formatLazyRouteAnalysis(analysis);

      expect(formatted).toContain("high");
      expect(formatted).toContain("low");
    });
  });

  describe("Performance scenarios", () => {
    it("should handle large route trees efficiently", () => {
      const routes: RouteDefinition[] = [];
      for (let i = 0; i < 50; i++) {
        routes.push(createRoute(`/route${i}`, { size: 20 * 1024 }));
      }

      const start = Date.now();
      const analysis = analyzeRouteStructure(routes);
      const elapsed = Date.now() - start;

      expect(analysis.totalRoutes).toBe(50);
      expect(elapsed).toBeLessThan(100); // Should be fast
    });

    it("should detect optimal splitting for SPA", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { priority: 100, size: 100 * 1024 }), // Initial
        createRoute("/dashboard", { lazy: true, size: 150 * 1024 }),
        createRoute("/admin", { lazy: true, size: 200 * 1024 }),
        createRoute("/api", { lazy: true, size: 80 * 1024 }),
      ];

      const result = generateSplitStrategy(routes);

      expect(result.analysis.lazyRoutes).toBeGreaterThan(0);
      expect(result.strategy.splitRoutes.length).toBeGreaterThan(0);
    });

    it("should score high for well-split routes", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { lazy: false, size: 40 * 1024 }),
        createRoute("/page1", { lazy: true, size: 50 * 1024 }),
        createRoute("/page2", { lazy: true, size: 45 * 1024 }),
        createRoute("/page3", { lazy: true, size: 55 * 1024 }),
      ];

      const analysis = analyzeRouteStructure(routes);

      expect(analysis.score).toBeGreaterThan(40); // Good splitting strategy
    });

    it("should score lower for poor splitting", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", { lazy: false, size: 500 * 1024 }), // All eager
        createRoute("/page1", { lazy: false, size: 50 * 1024 }),
        createRoute("/page2", { lazy: false, size: 45 * 1024 }),
      ];

      const analysis = analyzeRouteStructure(routes);

      expect(analysis.score).toBeLessThan(70); // Poor splitting
    });
  });

  describe("Integration scenarios", () => {
    it("should handle real-world route structure", () => {
      const routes: RouteDefinition[] = [
        createRoute("/", {
          priority: 100,
          size: 100 * 1024,
          children: [
            createRoute("/dashboard", {
              lazy: true,
              size: 80 * 1024,
              children: [
                createRoute("/profile", { size: 30 * 1024 }),
                createRoute("/settings", { size: 25 * 1024 }),
              ],
            }),
            createRoute("/marketplace", { lazy: true, size: 120 * 1024 }),
          ],
        }),
        createRoute("/admin", { lazy: true, size: 150 * 1024, priority: 20 }),
      ];

      const result = generateSplitStrategy(routes);

      expect(result.analysis.totalRoutes).toBeGreaterThan(4);
      expect(result.strategy.splitRoutes).toBeDefined();
    });

    it("should combine analysis with validation", () => {
      const rawRoutes = [
        { path: "/", priority: 100, size: 50 * 1024 },
        { path: "/admin", lazy: true, priority: 20, size: 100 * 1024 },
      ];

      const validated = validateRoutes(rawRoutes);
      const analysis = analyzeRouteStructure(validated);

      expect(analysis.totalRoutes).toBe(2);
      expect(analysis.lazyRoutes).toBe(1);
    });

    it("should track complex dependencies", () => {
      const routes: RouteDefinition[] = [
        createRoute("/dashboard", {
          size: 100 * 1024,
          children: [
            createRoute("/reports", { size: 50 * 1024 }),
            createRoute("/analytics", { size: 60 * 1024 }),
            createRoute("/export", { size: 30 * 1024 }),
          ],
        }),
      ];

      const analysis = analyzeRouteStructure(routes);

      expect(analysis.totalRoutes).toBe(4);
      expect(analysis.colocatedRoutes).toBeGreaterThanOrEqual(0);
    });
  });
});
