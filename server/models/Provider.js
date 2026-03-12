import mongoose from "mongoose";

/* ================= SERVICES ================= */

const serviceSchema = new mongoose.Schema(
{
  name:{
    type:String,
    required:true,
    trim:true
  },

  price:{
    type:Number,
    required:true,
    min:0
  },

  description:{
    type:String,
    trim:true,
    default:""
  }
},
{ _id:true }
);


/* ================= DOCUMENTS ================= */

const documentSchema = new mongoose.Schema(
{
  name:String,
  path:String,
  size:Number,
  type:String
},
{ _id:false }
);


/* ================= AVAILABILITY ================= */

const availabilitySchema = new mongoose.Schema(
{
  days:{
    type:[String],
    enum:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    default:[]
  },

  start:{
    type:String,
    default:"08:00"
  },

  end:{
    type:String,
    default:"18:00"
  }
},
{ _id:false }
);


/* ================= GEO LOCATION ================= */

const geoSchema = new mongoose.Schema(
{
  type:{
    type:String,
    enum:["Point"],
    default:"Point"
  },

  coordinates:{
    type:[Number], // [lng, lat]
    index:"2dsphere"
  }

},
{ _id:false }
);


/* ================= PROVIDER ================= */

const providerSchema = new mongoose.Schema(
{

  /* Linked user account */

  user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    required:true,
    unique:true,
    index:true
  },


  /* Admin approval */

  status:{
    type:String,
    enum:["pending","approved","rejected"],
    default:"approved",
    index:true
  },


  /* Online availability */

  availabilityStatus:{
    type:String,
    enum:["Online","Offline","Busy"],
    default:"Offline"
  },


  /* Basic profile info */

  basicInfo:{

    providerName:{
      type:String,
      required:true,
      trim:true
    },

    email:{
      type:String,
      required:true,
      trim:true,
      lowercase:true
    },

    phone:{
      type:String,
      trim:true
    },

    location:{
      type:String,
      trim:true
    },

    businessName:{
      type:String,
      trim:true
    },

    photoURL:{
      type:String,
      default:""
    }
  },


  /* Provider bio */

  bio:{
    type:String,
    trim:true,
    default:""
  },


  /* Service category */

  category:{
    type:String,
    trim:true,
    index:true
  },


  /* Experience */

  experience:{
    type:Number,
    default:0,
    min:0
  },


  /* Ratings */

  rating:{
    type:Number,
    default:0,
    min:0,
    max:5
  },

  reviewCount:{
    type:Number,
    default:0
  },


  /* GEO LOCATION */

  location:{
    type:geoSchema,
    default:{
      type:"Point",
      coordinates:[0,0]
    }
  },


  /* Services offered */

  services:{
    type:[serviceSchema],
    default:[],
    validate:{
      validator:function(services){
        const names = services.map(s => s.name.toLowerCase());
        return new Set(names).size === names.length;
      },
      message:"Duplicate services are not allowed"
    }
  },


  /* Working availability */

  availability:{
    type:availabilitySchema,
    default:{}
  },


  /* Uploaded verification docs */

  documents:{
    type:[documentSchema],
    default:[]
  }

},
{ timestamps:true }
);


/* ================= INDEXES ================= */

/* Search by name & category */

providerSchema.index({
  "basicInfo.providerName":"text",
  category:"text"
});

/* Fast filtering */

providerSchema.index({
  category:1,
  status:1
});


/* ================= MODEL ================= */

export default mongoose.model("Provider", providerSchema);