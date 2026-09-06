module.exports = function slugify(value='') {
  return value.toString().normalize('NFKD').toLowerCase().trim()
    .replace(/[^\p{L}\p{N}\s-]/gu,'')
    .replace(/[\s_-]+/g,'-').replace(/^-+|-+$/g,'');
};
