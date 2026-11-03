export function validate(b) {
 if(!b || typeof b!=="object" || !/^[a-f0-9]{64}$/.test(b.invite||"") || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(b.id||"")) return false;
 return typeof b.name==="string" && b.name.trim().length>0 && b.name.length<=100 && typeof b.note==="string" && b.note.length<=1000 && [b.interests,b.talents].every(a=>Array.isArray(a)&&a.length<=30&&a.every(x=>typeof x==="string"&&x.trim().length>0&&x.length<=80));
}
