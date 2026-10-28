from pathlib import Path
import html,re,json,hashlib
project=Path(__file__).resolve().parent
root=project.parent
inner=(project/'src/marketplace.html').read_text(encoding='utf-8')
taxonomy=(project/'data/categories.json').read_text(encoding='utf-8')
json.loads(taxonomy)
inner=re.sub(r'(<script\b[^>]*\bid="wc-full-taxonomy"[^>]*>).*?(</script>)',lambda m:m[1]+taxonomy+m[2],inner,count=1,flags=re.S)
logo=(root/'logo.svg').read_text(encoding='utf-8')
inner=re.sub(r'(<span class="wh-brand" aria-label="Wreeo">).*?(</span>)',lambda m:m[1]+logo+m[2],inner,count=1,flags=re.S)
shell=(project/'src/preview-shell.html').read_text(encoding='utf-8')
assert shell.count('__WREEO_MARKETPLACE_SRCDOC__')==1
page=shell.replace('__WREEO_MARKETPLACE_SRCDOC__',html.escape(inner,quote=True))
(root/'index.html').write_text(page,encoding='utf-8')
print('Built index.html — SHA-256 '+hashlib.sha256(page.encode()).hexdigest())
