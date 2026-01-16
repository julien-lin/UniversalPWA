# frozen_string_literal: true

require "http"
require "json"

module UniversalPwa
  class HttpClient
    def initialize(api_endpoint: "http://localhost:3000", timeout: 30, retries: 3)
      @api_endpoint = api_endpoint.delete_suffix("/")
      @timeout = timeout
      @retries = retries
    end

    def post(path, data)
      url = "#{@api_endpoint}#{path}"

      begin
        response = HTTP.timeout(@timeout).post(
          url,
          json: data,
          headers: { "Content-Type" => "application/json" }
        )

        raise ApiUnreachableError, "HTTP #{response.status}: #{response.body}" unless response.status.success?

        JSON.parse(response.body.to_s)
      rescue HTTP::TimeoutError
        raise ApiUnreachableError, "Request timed out after #{@timeout}s"
      rescue HTTP::ConnectionError => e
        raise ApiUnreachableError, "Cannot reach API at #{url}: #{e.message}"
      end
    end

    def close
      # HTTP gem manages connections automatically
    end
  end
end
