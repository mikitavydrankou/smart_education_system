const str=(minLength:number,maxLength:number)=>({type:'string',minLength,maxLength})
const id={...str(1,40),pattern:'^[a-z0-9-]+$'},integer={type:'integer',minimum:0,maximum:2}
const object=(properties:Record<string,unknown>)=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)})
const array=(items:unknown,minItems:number,maxItems:number)=>({type:'array',items,minItems,maxItems})
export const mediaSchemaFor=(reference:Record<string,unknown>={evidenceIndex:integer})=>object({
 diagram:object({title:str(1,120),nodes:array(object({id,label:str(1,80),detail:str(1,500),...reference}),2,6),edges:array(object({from:id,to:id,label:str(1,80),...reference}),1,8)}),
 narration:str(40,2600),
 activity:object({kind:{type:'string',enum:['order','match','classify']},prompt:str(8,400),items:array(object({id,label:str(1,200),explanation:str(1,400)}),3,6),targets:array(object({id,label:str(1,300)}),0,6),solution:array(id,3,6),reason:str(8,800)}),
})

export const mediaSchema=mediaSchemaFor()
