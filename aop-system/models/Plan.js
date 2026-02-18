const mongoose = require('mongoose');

const RowSchema = new mongoose.Schema({
  rowNo:               { type: Number, required: true },
  pap:                 { type: String, default: '' },
  perfIndicator:       { type: String, default: '' },
  targetQ1:            { type: Number, default: 0 },
  targetQ2:            { type: Number, default: 0 },
  targetQ3:            { type: Number, default: 0 },
  targetQ4:            { type: Number, default: 0 },
  actualQ1:            { type: Number, default: 0 },
  actualQ2:            { type: Number, default: 0 },
  actualQ3:            { type: Number, default: 0 },
  actualQ4:            { type: Number, default: 0 },
  office:              { type: String, default: '' },
  totalEstCost:        { type: Number, default: 0 },
  fundSource:          { type: String, default: '' },
  risk:                { type: String, default: '' },
  mitigatingActivities:{ type: String, default: '' },
  proofFile:           { type: String, default: '' }   // filename stored in /uploads
});

const PlanSchema = new mongoose.Schema({
  idNo:            { type: Number },                   // auto-incremented on save
  developmentArea: { type: String, required: true },
  outcome:         { type: String, required: true },
  strategy:        { type: String, required: true },
  rows:            [RowSchema],
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Auto-increment idNo before first save
PlanSchema.pre('save', async function(next) {
  if (this.isNew) {
    const last = await this.constructor.findOne({}, {}, { sort: { idNo: -1 } });
    this.idNo = last ? last.idNo + 1 : 1;
  }
  next();
});

module.exports = mongoose.model('Plan', PlanSchema);
