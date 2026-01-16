# frozen_string_literal: true

module UniversalPwa
  class Error < StandardError; end
  class ConfigurationError < Error; end
  class ScanError < Error; end
  class GenerationError < Error; end
  class ValidationError < Error; end
  class HttpError < Error; end
  class ApiUnreachableError < HttpError; end
end
