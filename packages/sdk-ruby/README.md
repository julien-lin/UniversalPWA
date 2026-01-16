# Ruby SDK for UniversalPWA

[![Gem](https://img.shields.io/gem/v/universal-pwa.svg)](https://rubygems.org/gems/universal-pwa)
[![Tests](https://img.shields.io/github/actions/workflow/status/julien-lin/universal-pwa/test-ruby.yml?branch=main)](https://github.com/julien-lin/universal-pwa/actions)
[![Coverage](https://img.shields.io/codecov/c/github/julien-lin/universal-pwa/main?flag=ruby)](https://codecov.io/gh/julien-lin/universal-pwa)

Ruby SDK for [UniversalPWA](https://universalpwa.dev) - Generate Progressive Web Apps from Ruby on Rails applications.

## 🚀 Quick Start

### Installation

Add to your Gemfile:

```ruby
gem "universal-pwa", "~> 2.0.0.dev"
```

Then run:

```bash
bundle install
```

### Rails

```ruby
require "universal_pwa"

# Auto-configure from Rails
integration = UniversalPwa::RailsIntegration.new
config = integration.auto_configure

# Generate PWA
client = UniversalPwa::Client.new(config)
result = client.generate

puts "PWA generated!"
puts result
```

## 📚 Usage

### Scan Project

```ruby
client = UniversalPwa::Client.new(config)
scan_result = client.scan

puts "Framework: #{scan_result}"
```

### Generate PWA

```ruby
result = client.generate

puts "Manifest: #{result}"
```

### Validate PWA

```ruby
validation = client.validate

puts "Valid: #{validation}"
```

## 🔧 Configuration

```ruby
config = UniversalPwa::Configuration.new(
  project_root: Rails.root.to_s,
  app_name: "My App",
  backend: "rails",
  generate_icons: true
)

client = UniversalPwa::Client.new(config)
```

## 📖 Documentation

- [API Reference](https://docs.universalpwa.dev/sdk/ruby)
- [Rails Integration](https://docs.universalpwa.dev/sdk/ruby/rails)

## 🧪 Testing

```bash
bundle exec rspec
```

## 📄 License

MIT
