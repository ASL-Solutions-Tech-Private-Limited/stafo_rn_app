require 'json'
package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'stafo-location'
  s.version      = package['version']
  s.summary      = package['description']
  s.homepage     = 'https://stafo.in'
  s.license      = { :type => 'UNLICENSED' }
  s.author       = 'STAFO'
  s.platform     = :ios, '15.5'
  s.source       = { :path => '.' }
  s.source_files = 'ios/**/*.{h,m,mm}'
  s.frameworks   = 'CoreLocation'

  install_modules_dependencies(s)
end
