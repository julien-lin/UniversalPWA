# frozen_string_literal: true

module UniversalPwa
  class RailsIntegration
    def initialize(rails_app = nil)
      @app = rails_app || ::Rails.application
    end

    def auto_configure
      Configuration.new(
        project_root: @app.root.to_s,
        app_name: ENV["APP_NAME"] || @app.class.parent.to_s,
        backend: "rails",
        generate_icons: true,
        manifest_path: config_manifest_path,
        service_worker_path: config_sw_path
      )
    end

    private

    def config_manifest_path
      ENV["PWA_MANIFEST_PATH"] || "public/manifest.json"
    end

    def config_sw_path
      ENV["PWA_SW_PATH"] || "public/sw.js"
    end
  end
end
