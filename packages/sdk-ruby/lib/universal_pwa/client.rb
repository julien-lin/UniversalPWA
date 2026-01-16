# frozen_string_literal: true

module UniversalPwa
  class Client
    def initialize(config)
      @config = config
      @http_client = HttpClient.new(
        api_endpoint: config.api_endpoint,
        timeout: config.timeout
      )
    end

    def scan
      request_data = {
        projectRoot: @config.project_root,
        autoDetectBackend: @config.auto_detect_backend
      }

      @http_client.post("/api/scan", request_data)
    end

    def generate(override_config = nil)
      merged = @config.to_h
      merged.merge!(override_config) if override_config

      request_data = { config: merged }

      @http_client.post("/api/generate", request_data)
    end

    def validate
      request_data = { projectRoot: @config.project_root }

      @http_client.post("/api/validate", request_data)
    end
  end
end
