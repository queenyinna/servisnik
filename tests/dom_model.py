import json,sys
from html.parser import HTMLParser
from pathlib import Path
class Parser(HTMLParser):
 def __init__(self): super().__init__();self.root={'tag':'document','attrs':{},'children':[]};self.stack=[self.root]
 def handle_starttag(self,tag,attrs):
  n={'tag':tag,'attrs':dict(attrs),'children':[]};self.stack[-1]['children'].append(n)
  if tag not in ['meta','link','input','br','hr','img','source','wbr']:self.stack.append(n)
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i]['tag']==tag:self.stack=self.stack[:i];break
 def handle_data(self,data):
  if self.stack[-1]['tag'] not in ['style','script']:self.stack[-1]['text']=self.stack[-1].get('text','')+data
p=Parser();p.feed(Path(sys.argv[1]).read_text());print(json.dumps(p.root))
