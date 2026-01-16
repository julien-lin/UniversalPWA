# frozen_string_literal: true

require "dry/struct"
require "dry/types"

module UniversalPwa
  module Types
    include Dry::Types()
  end

  class Configuration < Dry::Struct
    # Required
    attribute :project_root, Types::String

    # Application metadata
    attribute? :app_name, Types::String
    attribute? :app_description, Types::String
    attribute :app_theme_color, Types::String.default("#000000")
    attribute :app_background_color, Types::String.default("#FFFFFF")
    attribute :app_start_url, Types::String.default("/")
    attribute :app_scope, Types::String.default("/")

    # Backend detection
    attribute :auto_detect_backend, Types::Bool.default(true)
    attribute? :backend, Types::String

    # Icon generation
    attribute :generate_icons, Types::Bool.default(true)
    attribute :generate_splash_screens, Types::Bool.default(false)
    attribute? :icon_source, Types::String

    # Caching
    attribute :caching_strategy, Types::String.default("balanced")

    # Output
    attribute? :output_dir, Types::String
    attribute :manifest_path, Types::String.default("public/manifest.json")
    attribute :service_worker_path, Types::String.default("public/sw.js")

    # API
    attribute :api_endpoint, Types::String.default("http://localhost:3000")
    attribute :timeout, Types::Integer.default(30)
  end
end
