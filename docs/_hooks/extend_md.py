import markdown

MARKDOWN_EXTENSIONS = ["def_list"]

def extended_markdown(text):
    return markdown.markdown(text, extensions=MARKDOWN_EXTENSIONS)
    
Config.transformers['markdown'] = extended_markdown

