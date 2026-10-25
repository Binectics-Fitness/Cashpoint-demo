import re
def split_statements(css):
    css=re.sub(r'/\*.*?\*/','',css,flags=re.S)
    out=[];i=0;n=len(css)
    while i<n:
        while i<n and css[i] in ' \n\r\t': i+=1
        if i>=n: break
        j=css.find('{',i)
        if j<0: break
        depth=0;k=j
        while k<n:
            if css[k]=='{': depth+=1
            elif css[k]=='}':
                depth-=1
                if depth==0: break
            k+=1
        out.append(css[i:k+1].strip()); i=k+1
    return out
def norm(s): return re.sub(r'\s+',' ',s).strip()
def selector(s): return norm(s.split('{',1)[0])
