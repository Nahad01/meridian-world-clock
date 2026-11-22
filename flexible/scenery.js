'use strict';
// Decorative silhouettes stretch to the card width. Clock information stays in HTML.
function landscape(id,night){
 const sky=night?'#a9c0bc':'#708b70',far=night?'#52747a':'#b2c1a3',near=night?'#799b98':'#819b80';
 const silhouettes={
 ontario:'M0 58H14V41H25V52H35V32H49V53H56V22H66V47H79L84 24H82V20H86L88 1L90 20H94V24H92L97 53H109V35H122V47H130V28H137V23H143V28H150V49H162V37H178V54H192V44H209V51H223V34H235V54H256V65H0Z',
 kerala:'M0 59Q28 48 52 55Q82 63 101 54Q132 42 159 52Q201 63 256 46V68H0Z',
 dubai:'M0 61V50H20V42H32V55H45V31L56 24V55H62V39H73V49H82V29H90V18H97V53H107V37H114V24H118V12H121L123 0L125 21H128V32H132V45H137V57H148V26L161 18V54H171V38H179V28H188V54H202V31Q214 38 215 55H228V45H240V57H256V68H0Z',
 'new-york':'M0 61V51H12V35H23V54H32V29H47V48H56V32H61V25H67V14L69 5L71 14V25H78V32H82V54H89V38H98V28H105V43H117V22H129V51H140V35H149V29H158V54H167V43H178V20H188V12H191V20H195V44H203V30H215V54H228V37H242V53H256V68H0Z'};
 const palm=(x,y,s)=>'<g transform="translate('+x+' '+y+') scale('+s+')" fill="'+near+'"><path d="M-3 0Q2-18 0-34Q-10-29-17-19Q-15-32-3-37Q-15-38-24-32Q-17-45-2-40Q-10-51-17-49Q-7-56 2-42Q8-55 21-49Q11-48 5-39Q19-44 27-32Q15-38 5-36Q18-33 17-21Q11-30 3-33Q7-14 3 0Z"/></g>';
 return '<svg viewBox="0 0 256 70" preserveAspectRatio="none" aria-hidden="true"><g fill="'+sky+'">'+(night?'<path d="M27 5a8 8 0 1 0 10 11A10 10 0 0 1 27 5Z"/><circle cx="56" cy="8" r="1"/><circle cx="192" cy="8" r="1.2"/>':'<circle cx="37" cy="19" r="9" fill="#d3a157"/>')+'</g><path fill="'+far+'" d="M0 50Q44 30 73 46T143 39T208 40T256 33V66H0Z"/><path fill="'+near+'" d="'+(silhouettes[id]||silhouettes.ontario)+'"/>'+(id==='kerala'?palm(38,58,.92)+palm(56,57,.65)+palm(199,56,.77)+'<path fill="'+sky+'" d="M96 59q28 8 51-2q-8 11-39 8z"/>':'')+'<path fill="'+sky+'" opacity=".3" d="M0 64Q69 58 135 63T256 60V70H0Z"/></svg>';
}
