config :editor,
  :required => %w(tiki tiki/platform/classic tiki/system sproutcore/runtime bespin),
  :dynamic_required => [],
  :test_required => [],
  :test_debug => [],
  :use_modules => true,
  :factory_format => :function

config :sproutcore,
  :factory_format => :function

