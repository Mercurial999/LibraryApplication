import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Button from "../../components/Button";
import InputField from "../../components/InputField";
import ApiService from "../../services/ApiService.js";

const RadioOption = ({ label, value, selected, onPress }) => (
  <TouchableOpacity style={styles.optionRow} onPress={() => onPress(value)}>
    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
      {selected && <View style={styles.radioInner} />}
    </View>
    <Text style={styles.optionLabel}>{label}</Text>
  </TouchableOpacity>
);

const Dropdown = ({ label, placeholder, options, selectedValue, onSelect }) => {
  const [open, setOpen] = useState(false);
  const currentLabel = options.find(o => o.value === selectedValue)?.label;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontWeight: "600", marginBottom: 6 }}>{label}</Text>
      <TouchableOpacity style={styles.dropdownHeader} onPress={() => setOpen(!open)}>
        <Text style={{ color: currentLabel ? "#222" : "#777" }}>{currentLabel || placeholder}</Text>
        <Text style={{ color: "#777" }}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownList}>
          {options.map(opt => (
            <TouchableOpacity key={opt.value} style={styles.dropdownItem} onPress={() => { onSelect(opt.value); setOpen(false); }}>
              <Text>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const RegistrationScreen = () => {
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(""); // "teacher" | "student"
  const [department, setDepartment] = useState(""); // when teacher
  const [gradeLevel, setGradeLevel] = useState(""); // free-text/class/section
  const [academicLevel, setAcademicLevel] = useState(""); // when student: "elementary" | "high-school" | "college"
  const [password, setPassword] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(null); // { uri, name, type, base64 }
  const [idPhoto, setIdPhoto] = useState(null); // { uri, name, type, base64 }
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validate = () => {
    if (!firstName || !lastName || !email || !role || !password) {
      Alert.alert("Validation Error", "Please fill in first name, last name, email, role and password.");
      return false;
    }
    if (!email.includes("@")) {
      Alert.alert("Validation Error", "Please enter a valid email address.");
      return false;
    }
    if (password.length < 6) {
      Alert.alert("Validation Error", "Password must be at least 6 characters.");
      return false;
    }
    if (role === "teacher" && !department) {
      Alert.alert("Validation Error", "Please choose your department.");
      return false;
    }
    if (role === "student" && !academicLevel) {
      Alert.alert("Validation Error", "Please choose your academic level.");
      return false;
    }
    if (!profilePhoto || !idPhoto) {
      Alert.alert("Validation Error", "Please upload a 2x2 photo and a photo of your ID with date.");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // Try to upload images first (preferred: Cloudinary via backend helper)
      let uploadedStudent = null;
      let uploadedId = null;
      try {
        if (profilePhoto?.uri) {
          const up = await ApiService.uploadImage(profilePhoto, 'studentPhoto');
          if (up?.success && up?.data) uploadedStudent = up.data; // { url, publicId }
        }
        if (idPhoto?.uri) {
          const up = await ApiService.uploadImage(idPhoto, 'idPhoto');
          if (up?.success && up?.data) uploadedId = up.data; // { url, publicId }
        }
      } catch (e) {
        // If upload helper fails (e.g., CORS or endpoint missing), fallback to base64 inline
        console.log('Upload helper failed, falling back to base64:', e?.message || e);
      }

      const borrower = {
        firstName,
        middleInitial,
        lastName,
        email,
        role,
        gradeLevel,
        academicLevel, // mapped to academicLevelType by service
        password,
        department,
        // Preferred: Cloudinary identifiers/URLs if upload succeeded; else send base64
        studentPhoto: uploadedStudent?.publicId || uploadedStudent?.url || (profilePhoto?.base64 ? `data:image/jpeg;base64,${profilePhoto.base64}` : null),
        idPhoto: uploadedId?.publicId || uploadedId?.url || (idPhoto?.base64 ? `data:image/jpeg;base64,${idPhoto.base64}` : null),
        // pass file objects too for native multipart
        profilePhotoFile: profilePhoto || null,
        idPhotoFile: idPhoto || null,
      };
      const result = await ApiService.registerBorrower(borrower);
      Alert.alert("Success", result.message || "Registration submitted.");
      router.push("/registration-complete");
    } catch (err) {
      console.warn("Register error", err);
      Alert.alert("Registration Failed", err?.message || String(err) || "Unable to register.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (setter) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permission required", "Please allow photo library access to upload images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const file = {
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
        base64: asset.base64 || null,
      };
      setter(file);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={64}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
      <Text style={{ marginBottom: 6, fontWeight: "600" }}>Name</Text>
      <View style={{ flexDirection: "row", marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <InputField label="First Name" value={firstName} onChangeText={setFirstName} />
        </View>
        <View style={{ width: 80, marginRight: 8 }}>
          <InputField label="M.I." value={middleInitial} onChangeText={setMiddleInitial} />
        </View>
        <View style={{ flex: 1 }}>
          <InputField label="Last Name" value={lastName} onChangeText={setLastName} />
        </View>
      </View>
      <InputField label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Text style={{ marginTop: 8, marginBottom: 6, fontWeight: "600" }}>Role</Text>
      <RadioOption label="Student" value="student" selected={role === "student"} onPress={setRole} />
      <RadioOption label="Teacher" value="teacher" selected={role === "teacher"} onPress={setRole} />

      {role === "teacher" && (
        <Dropdown
          label="Department"
          placeholder="Choose department"
          options={[
            { label: "Mathematics", value: "Mathematics" },
            { label: "Science", value: "Science" },
            { label: "English", value: "English" },
            { label: "Social Studies", value: "Social Studies" },
            { label: "ICT", value: "ICT" },
          ]}
          selectedValue={department}
          onSelect={setDepartment}
        />
      )}

      {role === "student" && (
        <>
          <Text style={{ marginTop: 8, marginBottom: 6, fontWeight: "600" }}>Academic Level</Text>
          <RadioOption label="Elementary" value="elementary" selected={academicLevel === "elementary"} onPress={setAcademicLevel} />
          <RadioOption label="High School" value="high-school" selected={academicLevel === "high-school"} onPress={setAcademicLevel} />
          <RadioOption label="College" value="college" selected={academicLevel === "college"} onPress={setAcademicLevel} />
        </>
      )}

      <InputField label="Grade / Class / Section" value={gradeLevel} onChangeText={setGradeLevel} />

      <Text style={{ marginTop: 8, marginBottom: 6, fontWeight: "600" }}>Verification Photos</Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(setProfilePhoto)}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>Pick 2x2 Photo</Text>
        </TouchableOpacity>
        {profilePhoto?.uri && <Image source={{ uri: profilePhoto.uri }} style={[styles.preview, { marginLeft: 12 }]} />}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(setIdPhoto)}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>Pick ID w/ Date</Text>
        </TouchableOpacity>
        {idPhoto?.uri && <Image source={{ uri: idPhoto.uri }} style={[styles.preview, { marginLeft: 12 }]} />}
      </View>

      <InputField label="Password" value={password} onChangeText={setPassword} secureTextEntry />

      <Button title={loading ? "Registering..." : "Register"} onPress={handleRegister} disabled={loading} />
      {loading && <ActivityIndicator style={{ marginTop: 12 }} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    paddingBottom: 32,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#777",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioOuterSelected: { borderColor: "#2196f3" },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2196f3",
  },
  optionLabel: { fontSize: 16, color: "#222" },
  dropdownHeader: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginTop: 6,
    overflow: "hidden",
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  uploadBtn: {
    backgroundColor: "#3498db",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  preview: { width: 44, height: 44, borderRadius: 6, borderWidth: 1, borderColor: "#ddd" },
});

export default RegistrationScreen;
