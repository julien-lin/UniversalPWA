Gem::Specification.new do |spec|
  spec.name          = "universal-pwa"
  spec.version       = "2.0.0.dev0"
  spec.authors       = ["UniversalPWA Team"]
  spec.email         = ["info@universalpwa.dev"]
  spec.homepage      = "https://universalpwa.dev"
  spec.summary       = "Universal PWA SDK for Ruby on Rails and other frameworks"
  spec.description   = "Generate Progressive Web Apps from Rails, Sinatra, and other Ruby frameworks"
  spec.license       = "MIT"

  spec.files = Dir.glob("lib/**/*.rb") + %w[README.md CHANGELOG.md LICENSE]
  spec.require_paths = ["lib"]

  spec.required_ruby_version = ">= 2.7"

  spec.add_dependency "http", "~> 5.1"
  spec.add_dependency "dry-struct", "~> 1.6"

  spec.add_development_dependency "bundler", "~> 2.0"
  spec.add_development_dependency "rspec", "~> 3.12"
  spec.add_development_dependency "rspec-rails", "~> 6.0"
  spec.add_development_dependency "rubocop", "~> 1.50"
  spec.add_development_dependency "rails", "~> 7.0"
end
