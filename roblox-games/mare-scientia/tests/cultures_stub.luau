Color3 = { fromRGB = function(r, g, b) return { r, g, b } end }
Enum = setmetatable({}, { __index = function(_, k) return setmetatable({}, { __index = function(_, n) return k .. "." .. n end }) end })
