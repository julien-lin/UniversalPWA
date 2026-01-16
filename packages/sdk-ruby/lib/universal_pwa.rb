# frozen_string_literal: true

require_relative "universal_pwa/version"
require_relative "universal_pwa/client"
require_relative "universal_pwa/configuration"
require_relative "universal_pwa/exceptions"
require_relative "universal_pwa/http_client"

module UniversalPwa
  class Error < StandardError; end

  def self.client(config)
    Client.new(config)
  end
end
